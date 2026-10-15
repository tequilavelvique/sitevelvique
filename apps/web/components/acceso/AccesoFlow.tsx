"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { parseEventLogs } from "viem";
import { accessAbi } from "@velvique/contracts";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel, useNight } from "@/components/providers/NightProvider";
import { Edge } from "@/components/bits/Edge";
import { Seal } from "@/components/bits/Seal";
import { PassLanyard } from "@/components/bits/PassLanyard";
import { Logo } from "@/components/chrome/Logo";
import { usePass } from "@/lib/chain/hooks";
import { useWalletDoors } from "@/lib/chain/wallet";
import { encodeCall, sendSponsored } from "@/lib/chain/sponsored";
import { env } from "@/lib/env";
import { shortAddress } from "@/lib/media";
import { normalizeCode } from "@/lib/invite-code";
import { parseInviteParam, toContractVoucher, type SignedVoucher } from "@/lib/voucher";
import { QrScanner } from "./QrScanner";

type Step = 0 | 1 | 2 | 3;
type Problem = "badCode" | "expired" | "used" | "failed" | null;

const isExpired = (v: SignedVoucher) => BigInt(v.voucher.deadline) * 1000n < BigInt(Date.now());

export function AccesoFlow() {
  const { t } = useSite();
  const a = t.acceso;
  useClockLabel(t.nav.n4);
  const { flash } = useNight();
  const params = useSearchParams();

  const [linkVoucher, setLinkVoucher] = useState<SignedVoucher | null>(() => parseInviteParam(params.get("i")));
  const [scanning, setScanning] = useState(params.get("scan") === "1");
  const [code, setCode] = useState("");
  const [chosenStep, setStep] = useState<Step>(0);
  const [flowProblem, setProblem] = useState<Problem>(null);

  const { address, isConnected, connectPasskey, connectWallet, ensureChain, pending } = useWalletDoors();
  const pass = usePass();

  const nonceUsed = useReadContract({
    address: env.access ?? undefined,
    abi: accessAbi,
    functionName: "usedNonce",
    args: linkVoucher ? [linkVoucher.voucher.nonce] : undefined,
    query: { enabled: Boolean(linkVoucher && env.access) },
  });

  // Already holding a pass: straight to the card.
  const step = pass.tier > 0 && chosenStep < 2 ? 3 : chosenStep;
  // A dead invitation link is a problem until the flow reports a newer one.
  const problem: Problem = flowProblem ?? (!linkVoucher ? null : nonceUsed.data ? "used" : isExpired(linkVoucher) ? "expired" : null);

  const tierName = (n: number) => t.tiers[String(n) as keyof typeof t.tiers];
  const offeredTier = linkVoucher?.voucher.tier ?? (Number(normalizeCode(code).slice(3, 4)) || 1);

  const proceed = () => {
    setProblem(null);
    if (!linkVoucher && !/^VQ-[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/.test(normalizeCode(code))) {
      setProblem("badCode");
      return;
    }
    setStep(1);
  };

  const mint = async () => {
    if (!address || !env.access) return;
    setStep(2);
    setProblem(null);
    try {
      await ensureChain();
      let signed = linkVoucher;
      if (!signed) {
        const res = await fetch("/api/voucher", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: normalizeCode(code), to: address }),
        });
        if (res.status === 403) throw new Error("badCode");
        if (!res.ok) throw new Error("failed");
        signed = (await res.json()) as SignedVoucher;
      }
      const { logs } = await sendSponsored(address, [encodeCall(env.access, accessAbi, "redeem", [toContractVoucher(signed.voucher), signed.sig])]);
      const minted = parseEventLogs({ abi: accessAbi, eventName: "PassMinted", logs });
      if (!minted.length) throw new Error("failed");
      await pass.refetch();
      setStep(3);
      flash();
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("AlreadyHolder")) {
        await pass.refetch();
        setStep(3);
        return;
      }
      setProblem(m.includes("badCode") ? "badCode" : m.includes("NonceUsed") ? "used" : m.includes("Expired") ? "expired" : "failed");
      setStep(m.includes("badCode") ? 0 : 1);
    }
  };

  const bars = useMemo(() => [0, 1, 2].map((i) => (step >= i ? "var(--led)" : "var(--dim)")), [step]);

  return (
    <main data-screen-label="07 Acceso" className="gutter" style={{ minHeight: "100svh", paddingTop: 120, paddingBottom: 80, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 48 }}>
      <div style={{ display: "flex", gap: 10 }} aria-hidden>
        {bars.map((c, i) => (
          <div key={i} style={{ flex: 1, height: 1, background: c, transition: "background .4s" }} />
        ))}
      </div>

      {step === 0 ? (
        <div className="stack center" style={{ gap: 28 }}>
          <div className="eyebrow">{a.s1}</div>
          <h1 className="display display--md">{linkVoucher ? a.s1h : a.s1h_none}</h1>
          {linkVoucher ? (
            <Edge className="center">
              <Seal text={`${a.pass} · ${tierName(linkVoucher.voucher.tier)}`} size={128} style={{ alignSelf: "center" }}>
                <Logo height={10} />
              </Seal>
              <div className="slab-title">{tierName(linkVoucher.voucher.tier)}</div>
              <div className="caption-i">{a.signed}</div>
            </Edge>
          ) : scanning ? (
            <QrScanner
              onResult={(text) => {
                setScanning(false);
                try {
                  const u = new URL(text);
                  const v = parseInviteParam(u.searchParams.get("i"));
                  if (v) setLinkVoucher(v);
                  else setProblem("badCode");
                } catch {
                  setCode(normalizeCode(text));
                }
              }}
              onCancel={() => setScanning(false)}
            />
          ) : (
            <>
              <label className="field field--code eyebrow">
                {a.orCode}
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VQ-XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                />
              </label>
              <button type="button" className="eyebrow hit" style={{ alignSelf: "center", background: "none", border: 0, cursor: "pointer", color: "var(--bone)" }} onClick={() => setScanning(true)}>
                {t.noche.scan}
              </button>
            </>
          )}
          {problem ? <p role="alert" className="caption-i" style={{ margin: 0 }}>{a[problem]}</p> : null}
          <button type="button" className="btn btn--led" onClick={proceed} disabled={problem === "used" || problem === "expired" || !env.access}>
            {a.redeem}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="stack center" style={{ gap: 28 }}>
          <div className="eyebrow">{a.s2}</div>
          <h1 className="display display--md">{a.s2h}</h1>
          <p className="lede" style={{ fontSize: 18, maxWidth: "none" }}>
            {a.s2p}
          </p>
          {problem ? <p role="alert" className="caption-i" style={{ margin: 0 }}>{a[problem]}</p> : null}
          <div className="stack" style={{ gap: 12, paddingTop: 8 }}>
            {isConnected && address ? (
              <>
                <div className="eyebrow">{shortAddress(address)}</div>
                <button type="button" className="btn btn--led" onClick={mint}>
                  {a.redeem} · {tierName(offeredTier)}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn--led" onClick={connectPasskey} disabled={pending}>
                  {a.passkey}
                </button>
                <button type="button" className="btn" onClick={connectWallet} disabled={pending}>
                  {a.wallet}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="stack center" style={{ gap: 28, paddingTop: 40 }} aria-live="polite">
          <div className="eyebrow">{a.s3}</div>
          <h1 className="display display--md">{a.s3h}</h1>
          <p className="lede" style={{ fontSize: 18, maxWidth: "none" }}>
            {a.s3p}
          </p>
        </div>
      ) : null}

      {step === 3 && address ? (
        <div className="stack center" style={{ gap: 32 }}>
          <div className="eyebrow">{a.in}</div>
          <div style={{ marginInline: "calc(var(--gutter) * -1)" }}>
            <PassLanyard top={[`${a.passT} ${tierName(pass.tier || offeredTier)}`, a.nonT]} bottom={[shortAddress(address), a.lotBase]} height="min(64svh, 560px)" />
          </div>
          <p className="lede" style={{ fontSize: 18, maxWidth: "none" }}>
            {a.s4p}
          </p>
          <div className="stack" style={{ gap: 12 }}>
            <Link href="/tienda" className="btn btn--led btn--block">
              {a.toStore}
            </Link>
            <Link href="/" className="btn">
              {a.back}
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
