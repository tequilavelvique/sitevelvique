"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type PublicClient, type WalletClient, parseEther, parseEventLogs } from "viem";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { catalogAbi, ordersAbi } from "@velvique/contracts";
import {
  InsufficientUsdcError,
  NATIVE_TOKEN,
  USDC,
  approveAndPurchaseCalls,
  executeSwap,
  formatUsdc,
  makeQuote,
  pollOnrampStatus,
  purchaseWithUsdc,
  requestOnrampSession,
  sellAmountFor,
  swapQuote,
  usdcBalance,
  type OnrampSession,
  type Rail,
} from "@velvique/pay";
import type { ShippingAddress } from "@velvique/vault";
import { regionOf } from "@velvique/content";
import { useSite } from "@/components/providers/SiteProvider";
import { useNight } from "@/components/providers/NightProvider";
import { commerceChain, wagmiConfig } from "@/lib/chain/config";
import { usePass } from "@/lib/chain/hooks";
import { useWalletDoors } from "@/lib/chain/wallet";
import { sendSponsored } from "@/lib/chain/sponsored";
import { env } from "@/lib/env";

export type SkuRow = {
  id: bigint;
  sku: { price: bigint; supplyCap: number; sold: number; perWallet: number; requiredTier: number; regionMask: number; active: boolean; metadataURI: string };
};

type Phase = "form" | "running" | "card" | "done" | "error";
type StepKey = "step_seal" | "step_upload" | "step_permit" | "step_swap" | "step_onramp" | "step_tx";

const EMPTY: ShippingAddress = { name: "", line1: "", line2: "", city: "", state: "", zip: "", country: "", phone: "" };

/**
 * Checkout. Order of operations (guide sections 5 and 6):
 *  1. read price from VelviqueCatalog (never from UI state)
 *  2. seal the address in this browser to the fulfillment key
 *  3. upload the envelope to Grove (ACL: fulfiller can delete after delivery)
 *  4. pay on the chosen rail; every rail ends as USDC into VelviqueOrders
 *  5. the receipt token is the record; we only display it.
 */
export function Checkout({ row, onClose }: { row: SkuRow; onClose: () => void }) {
  const { t, lang, region, regionBit } = useSite();
  const s = t.tienda;
  const { flash } = useNight();
  const pass = usePass();
  const { address, ensureChain } = useWalletDoors();

  const maxQty = Math.max(1, Math.min(row.sku.perWallet || 12, row.sku.supplyCap ? row.sku.supplyCap - row.sku.sold : 12));
  const [qty, setQty] = useState(1);
  const [ship, setShip] = useState<ShippingAddress>({ ...EMPTY, country: regionOf(region)[lang] });
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [rail, setRail] = useState<Rail>("usdc");
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState<StepKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<bigint | null>(null);
  const [onramp, setOnramp] = useState<OnrampSession | null>(null);

  // Close on Escape; plain address data dies with this component.
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && phase !== "running" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, phase]);

  const total = row.sku.price * BigInt(qty);
  const locale = lang === "ES" ? "es-MX" : "en-US";
  const ready = Boolean(ship.name && ship.line1 && ship.city && ship.zip && ship.country && ship.phone);
  const railCardUsReady = env.railCardUs && region === "US" && pass.isSmartAccount && contact.email && contact.phone;

  const pay = async () => {
    if (!address || !env.orders || !env.catalog || !env.fulfiller || !env.fulfillmentPubKey) {
      setError(s.error);
      setPhase("error");
      return;
    }
    setPhase("running");
    setError(null);
    try {
      await ensureChain();
      const publicClient = getPublicClient(wagmiConfig, { chainId: commerceChain.id }) as unknown as PublicClient;
      const walletClient = (await getWalletClient(wagmiConfig, { chainId: commerceChain.id })) as unknown as WalletClient;
      const usdc = USDC[env.chainId];

      const fresh = await publicClient.readContract({ address: env.catalog, abi: catalogAbi, functionName: "getSku", args: [row.id] });
      let quote = makeQuote(row.id, fresh.price, qty);

      // Vault + Grove load only now, never in the first bundle.
      const vault = await import("@velvique/vault");
      setStep("step_seal");
      const envelope = await vault.sealJson({ ...ship, sku: row.id.toString(), qty }, env.fulfiller, env.fulfillmentPubKey);
      setStep("step_upload");
      const acl = env.groveGenericAcl ? vault.shippingAclGeneric(env.orders, env.chainId) : vault.shippingAclWallet(env.fulfiller, env.chainId);
      const shippingURI = await vault.uploadEnvelope(envelope, acl);
      const base = { buyer: address, orders: env.orders, usdc, region: regionBit, shippingURI, shippingHash: envelope.sha256 };

      let id: bigint;
      if (rail === "usdc") {
        ({ orderId: id } = await purchaseWithUsdc({ publicClient, walletClient, quote, ...base }, (st) => setStep(st === "permit" ? "step_permit" : "step_tx")));
      } else if (rail === "swap") {
        const have = await usdcBalance(publicClient, usdc, address);
        if (have < quote.total) {
          setStep("step_swap");
          const req = { chainId: env.chainId, sellToken: NATIVE_TOKEN, buyToken: usdc, taker: address } as const;
          const sellAmount = await sellAmountFor(req, quote.total - have, parseEther("0.001"));
          const q = await swapQuote({ ...req, sellAmount });
          await executeSwap({ publicClient, walletClient, taker: address, quote: q, sellToken: NATIVE_TOKEN });
          quote = makeQuote(row.id, fresh.price, qty);
        }
        ({ orderId: id } = await purchaseWithUsdc({ publicClient, walletClient, quote, ...base }, (st) => setStep(st === "permit" ? "step_permit" : "step_tx")));
      } else if (rail === "card-us") {
        setStep("step_onramp");
        const have = await usdcBalance(publicClient, usdc, address);
        if (have < quote.total) {
          const session = await requestOnrampSession({
            destination: address,
            usdcAmount: (quote.total - have).toString(),
            region: "US",
            partnerRef: crypto.randomUUID(),
            contact: { email: contact.email, phone: contact.phone, phoneVerifiedAt: "" },
          });
          setOnramp(session);
          setPhase("card");
          await waitForFunds(publicClient, usdc, address, quote.total, session);
          setOnramp(null);
          setPhase("running");
        }
        // Re-read the price: the card leg can outlive the first quote.
        const again = await publicClient.readContract({ address: env.catalog, abi: catalogAbi, functionName: "getSku", args: [row.id] });
        quote = makeQuote(row.id, again.price, qty);
        setStep("step_tx");
        const { logs } = await sendSponsored(address, approveAndPurchaseCalls({ quote, ...base }));
        const [placed] = parseEventLogs({ abi: ordersAbi, eventName: "OrderPlaced", logs });
        if (!placed) throw new Error("OrderPlaced missing");
        id = placed.args.orderId;
      } else {
        throw new Error("rail D not available");
      }

      setOrderId(id);
      setPhase("done");
      flash();
    } catch (e) {
      setError(e instanceof InsufficientUsdcError ? s.insufficient : s.error);
      setPhase("error");
    } finally {
      setStep(null);
    }
  };

  const field = (k: keyof ShippingAddress, label: string, opts: { auto?: string; type?: string } = {}) => (
    <label className="field eyebrow" key={k}>
      {label}
      <input value={ship[k] ?? ""} onChange={(e) => setShip({ ...ship, [k]: e.target.value })} autoComplete={opts.auto} type={opts.type ?? "text"} />
    </label>
  );

  const rails: { key: Rail; label: string; enabled: boolean; note?: string }[] = [
    { key: "usdc", label: s.rail_a, enabled: true },
    { key: "swap", label: s.rail_b, enabled: env.railSwap },
    { key: "card-us", label: s.rail_c, enabled: env.railCardUs && region === "US" },
    { key: "card-latam", label: s.rail_d, enabled: false, note: s.rail_d_soon },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={s.buy} style={{ position: "fixed", inset: 0, zIndex: 55, background: "#000000F5", overflowY: "auto" }} data-lenis-prevent>
      <div className="gutter" style={{ maxWidth: 640, margin: "0 auto", paddingTop: 96, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 36 }}>
        <div className="rule-row eyebrow">
          <span>N.º {row.id.toString()}</span>
          <span className="line" />
          <button type="button" className="eyebrow hit" onClick={onClose} disabled={phase === "running"} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--bone)" }}>
            {s.close}
          </button>
        </div>

        {phase === "done" && orderId !== null ? (
          <div className="stack center" style={{ gap: 24 }}>
            <h2 className="display display--md">{s.done}</h2>
            <Link href={`/pedido/${orderId}`} className="btn btn--led">
              {s.see_order} · N.º {orderId.toString()}
            </Link>
          </div>
        ) : phase === "card" && onramp ? (
          <div className="stack" style={{ gap: 18 }}>
            <p className="eyebrow">{s.step_onramp}</p>
            <iframe src={onramp.paymentUrl} title={s.rail_c} allow="payment" style={{ width: "100%", height: 520, border: "1px solid var(--hairline)", background: "#fff" }} />
          </div>
        ) : phase === "running" ? (
          <div className="stack center" style={{ gap: 18, paddingBlock: 48 }} aria-live="polite">
            <p className="display display--md">{step ? s[step] : "…"}</p>
          </div>
        ) : (
          <>
            <label className="field eyebrow">
              {s.qty}
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 22 }}>
              <legend className="eyebrow" style={{ paddingBottom: 6 }}>
                {s.ship_t}
              </legend>
              <p className="lede" style={{ fontSize: 15, margin: 0 }}>
                {s.ship_p}
              </p>
              {field("name", s.f_name, { auto: "name" })}
              {field("line1", s.f_line1, { auto: "address-line1" })}
              {field("line2", s.f_line2, { auto: "address-line2" })}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 22 }}>
                {field("city", s.f_city, { auto: "address-level2" })}
                {field("state", s.f_state, { auto: "address-level1" })}
                {field("zip", s.f_zip, { auto: "postal-code" })}
                {field("country", s.f_country, { auto: "country-name" })}
              </div>
              {field("phone", s.f_phone, { auto: "tel", type: "tel" })}
            </fieldset>

            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <legend className="eyebrow" style={{ paddingBottom: 12 }}>
                {s.pay_t}
              </legend>
              {rails.map((r) => (
                <label key={r.key} className="cond" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 48, borderBottom: "1px solid var(--hairline)", opacity: r.enabled ? 1 : 0.4, fontSize: 16, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  <input type="radio" name="rail" checked={rail === r.key} disabled={!r.enabled} onChange={() => setRail(r.key)} />
                  <span style={{ flex: 1 }}>{r.label}</span>
                  {r.note ? <span className="eyebrow">{r.note}</span> : null}
                </label>
              ))}
              {rail === "card-us" ? (
                <div style={{ display: "grid", gap: 18, paddingTop: 12 }}>
                  <label className="field eyebrow">
                    {s.f_email}
                    <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" />
                  </label>
                  <label className="field eyebrow">
                    {s.f_phone}
                    <input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" />
                  </label>
                </div>
              ) : null}
            </fieldset>

            <div className="rule-row" style={{ alignItems: "baseline" }}>
              <span className="eyebrow">{s.total}</span>
              <span className="line" />
              <span style={{ fontSize: 24 }}>{formatUsdc(total, locale)}</span>
            </div>

            {error ? <p role="alert" className="caption-i" style={{ margin: 0 }}>{error}</p> : null}

            <button type="button" className="btn btn--led btn--block" onClick={pay} disabled={!ready || (rail === "card-us" && !railCardUsReady)}>
              {s.pay}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Funds arrival is read from the chain; provider status only advances the UI. */
async function waitForFunds(publicClient: PublicClient, usdc: `0x${string}`, owner: `0x${string}`, needed: bigint, session: OnrampSession) {
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    if ((await usdcBalance(publicClient, usdc, owner)) >= needed) return;
    const st = await pollOnrampStatus(session.orderId, session.provider);
    if (st === "failed") throw new Error("onramp failed");
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("onramp timeout");
}
