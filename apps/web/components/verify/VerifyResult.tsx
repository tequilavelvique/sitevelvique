"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { provenanceAbi } from "@velvique/contracts";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel, useNight } from "@/components/providers/NightProvider";
import { Glow, RuleRow } from "@/components/ui/primitives";
import { Footer } from "@/components/chrome/Footer";
import { useWalletDoors } from "@/lib/chain/wallet";
import { encodeCall, sendSponsored } from "@/lib/chain/sponsored";
import { env } from "@/lib/env";
import { Slab } from "@/components/bits/Slab";

/**
 * Bottle in hand: closes the loop from party photo to onchain provenance.
 * Claiming requires the wallet that placed the order, after Delivered (enforced by VelviqueProvenance).
 */
export function VerifyResult(props: { serial: string; deployed: boolean; registered: boolean; orderId: string | null; owner: string | null; claimedAt: number }) {
  const { t } = useSite();
  const v = t.verificar;
  useClockLabel(v.ts);
  const { flash } = useNight();
  const router = useRouter();
  const { address, isConnected, connectWallet, ensureChain, pending } = useWalletDoors();
  const [state, setState] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const claim = async () => {
    if (!address || !env.provenance) return;
    setState("claiming");
    setErr(null);
    try {
      await ensureChain();
      await sendSponsored(address, [encodeCall(env.provenance, provenanceAbi, "claim", [props.serial])]);
      setState("done");
      flash();
      router.refresh();
    } catch (e) {
      const m = (e as Error).message;
      setErr(m.includes("NotBuyer") ? v.claim_p : m.includes("NotDelivered") ? v.claim_p : t.tienda.error);
      setState("error");
    }
  };

  return (
    <main>
      <section className="gutter stack" style={{ minHeight: "80svh", paddingTop: 120, paddingBottom: 80, maxWidth: 640, margin: "0 auto", gap: 36, justifyContent: "center" }}>
        <RuleRow left={v.ts} right={`${v.serial} ${props.serial}`} />

        {!props.deployed ? (
          <>
            <h1 className="display display--md">{v.h}</h1>
            <p className="lede">{v.not_deployed}</p>
          </>
        ) : props.registered ? (
          <>
            <div style={{ position: "relative", display: "grid", placeItems: "center", paddingBlock: 24 }}>
              <Glow size="min(90vw,420px)" opacity={0.7} />
              <h1 className="display display--md center" style={{ position: "relative" }}>
                {v.ok_h}
              </h1>
            </div>
            <p className="lede center" style={{ margin: "0 auto" }}>
              {v.ok_p}
            </p>
            <Slab size={460}><div className="kv">
              <div>
                <span className="eyebrow">{v.serial}</span>
                <span className="v">{props.serial}</span>
              </div>
              <div>
                <span className="eyebrow">{v.order}</span>
                <span className="v">N.º {props.orderId}</span>
              </div>
            </div></Slab>
            {props.owner || state === "done" ? (
              <p className="caption-i center" style={{ margin: 0 }}>
                {state === "done" ? v.claimed_ok : v.claimed}
              </p>
            ) : (
              <div className="stack center" style={{ gap: 16 }}>
                <p className="eyebrow">{v.unclaimed}</p>
                <p className="lede" style={{ fontSize: 15, margin: "0 auto" }}>
                  {v.claim_p}
                </p>
                {err ? <p role="alert" className="caption-i" style={{ margin: 0 }}>{err}</p> : null}
                {isConnected ? (
                  <button type="button" className="btn btn--led" onClick={claim} disabled={state === "claiming"}>
                    {v.claim}
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={connectWallet} disabled={pending}>
                    {t.wallet.connect}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="display display--md">{v.no_h}</h1>
            <p className="lede">{v.no_p}</p>
          </>
        )}

        <div className="hairline-top" style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingTop: 18 }}>
          <Link href="/verificar" className="eyebrow hit" style={{ color: "var(--bone)" }}>
            {v.again}
          </Link>
          <Link href="/verificar#como-funciona" className="eyebrow hit">
            {v.how_link}
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
