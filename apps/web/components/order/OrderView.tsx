"use client";

import { useAccount } from "wagmi";
import { formatUsdc } from "@velvique/pay";
import { useSite, fill } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { Footer } from "@/components/chrome/Footer";
import { useSkuMeta } from "@/components/store/useSkuMeta";
import { explorer } from "@/lib/env";
import { mediaUrl, shortAddress } from "@/lib/media";
import { Slab } from "@/components/bits/Slab";

type Order = {
  id: string;
  buyer: `0x${string}`;
  payer: `0x${string}`;
  skuId: string;
  qty: number;
  region: number;
  status: number;
  createdBlock: string;
  createdAt: number;
  amount: string;
  shippingURI: string;
  shippingHash: `0x${string}`;
};
type Step = { status: number; proofURI: string; txHash: `0x${string}`; blockNumber: string; timestamp: number };

const LINE = [0, 1, 2, 3, 4, 5] as const;
const DELIVERED = 4;
const REFUNDED = 6;

export function OrderView({ order, history, skuMetaURI }: { order: Order; history: Step[]; skuMetaURI: string | null }) {
  const { t, lang } = useSite();
  const p = t.pedido;
  useClockLabel(p.ts);
  const { address } = useAccount();
  const meta = useSkuMeta(skuMetaURI ?? undefined);
  const owner = address?.toLowerCase() === order.buyer.toLowerCase();
  const locale = lang === "ES" ? "es-MX" : "en-US";
  const label = (n: number) => p.status[String(n) as keyof typeof p.status];
  const when = (ts: number) => (ts ? new Date(ts * 1000).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "");

  const reached = new Map(history.map((h) => [h.status, h]));
  const refunded = reached.has(REFUNDED);
  const steps = refunded ? [...LINE.filter((s) => reached.has(s)), REFUNDED] : LINE;

  return (
    <main>
      <section className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 48, maxWidth: 820 }}>
        <RuleRow left={p.ts} right={label(order.status)} />
        <h1 className="display display--xl">{fill(p.h, { id: order.id })}</h1>

        {!owner ? (
          <p className="lede">{p.owner_only}</p>
        ) : (
          <>
            <Slab size={460}><div className="kv">
              <div>
                <span className="eyebrow">{p.sku}</span>
                <span className="v">{meta.data?.name[lang] ?? `N.º ${order.skuId}`}</span>
              </div>
              <div>
                <span className="eyebrow">{p.qty}</span>
                <span className="v">{order.qty}</span>
              </div>
              <div>
                <span className="eyebrow">{p.amount}</span>
                <span className="v">{formatUsdc(BigInt(order.amount), locale)}</span>
              </div>
              <div>
                <span className="eyebrow">{p.shipping}</span>
                <span className="v" style={{ fontSize: 14, fontFamily: "var(--font-cond), sans-serif", letterSpacing: ".08em" }}>
                  {order.status >= DELIVERED && order.status !== REFUNDED ? p.shipping_gone : `${order.shippingHash.slice(0, 10)}…`}
                </span>
              </div>
            </div></Slab>

            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {steps.map((s) => {
                const hit = reached.get(s);
                return (
                  <li key={s} className="hairline-top" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "baseline", padding: "18px 0", opacity: hit ? 1 : 0.6 }}>
                    <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: hit && s === order.status ? "var(--led)" : hit ? "var(--bone)" : "transparent", border: "1px solid var(--bone)", boxShadow: hit && s === order.status ? "0 0 14px #4EA9D5" : "none" }} />
                    <span style={{ fontSize: 20 }}>{label(s)}</span>
                    <span className="eyebrow" style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {hit ? <span>{when(hit.timestamp)}</span> : null}
                      {hit ? (
                        <a href={`${explorer}/tx/${hit.txHash}`} target="_blank" rel="noreferrer" style={{ color: "var(--muted)" }}>
                          {p.tx} {shortAddress(hit.txHash)}
                        </a>
                      ) : null}
                      {hit?.proofURI ? (
                        <a href={mediaUrl(hit.proofURI) ?? "#"} target="_blank" rel="noreferrer" style={{ color: "var(--bone)" }}>
                          {p.proof}
                        </a>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="eyebrow" style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
              <span>{p.receipt}</span>
              <span>ERC-721 #{order.id}</span>
              <span>{shortAddress(order.buyer)}</span>
            </div>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
