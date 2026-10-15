"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { published, splitEvents } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel, useNight } from "@/components/providers/NightProvider";
import { useMembers, type Social } from "@/components/providers/MembersProvider";
import { RuleRow } from "@/components/ui/primitives";
import { ScrollReveal } from "@/components/bits/ScrollReveal";
import { SplitText } from "@/components/bits/SplitText";
import { Footer } from "@/components/chrome/Footer";
import { CDP_CONNECTOR_ID } from "@/lib/chain/config";
import { useWalletDoors } from "@/lib/chain/wallet";
import { normalizeCode } from "@/lib/invite-code";
import { eventStamp, formatDate } from "@/lib/format";
import { explorer } from "@/lib/env";
import { shortAddress } from "@/lib/media";
import { useClientValue } from "@/lib/use-client-value";
import { Edge } from "@/components/bits/Edge";
import { Slab } from "@/components/bits/Slab";
import { Seal } from "@/components/bits/Seal";
import { Shiny } from "@/components/bits/Shiny";
import { PassLanyard } from "@/components/bits/PassLanyard";

const SOCIALS: Social[] = ["google", "apple", "x"];
const codeFromLink = () => (new URLSearchParams(window.location.search).get("code") ?? "").toUpperCase();

/**
 * `/miembros` (and `/acceso`). The door:
 *   1. Socials -> Coinbase smart wallet, or your wallet via WalletConnect -> sign (SIWE)
 *   2. Link at least one social (wallet door)
 *   3. Membership claimed automatically: soulbound ERC-1155 minted on Base by our relayer
 *   4. Members journal and private nights open
 */
export function MembersArea() {
  const { t, lang, manifest } = useSite();
  const m = t.miembros;
  useClockLabel(m.ts);
  const { flash } = useNight();
  const members = useMembers();
  const { me, signedIn, busy, error, lastTx } = members;
  const { connector } = useAccount();
  const { isConnected, address: connected, connectWallet, pending } = useWalletDoors();
  // The invitation link may carry ?code=; whatever is typed replaces it.
  const linkCode = useClientValue(codeFromLink, "");
  const [typed, setCode] = useState<string | null>(null);
  const code = typed ?? linkCode;
  const [claimState, setClaimState] = useState<string | null>(null);

  const isMember = (me?.tier ?? 0) > 0;
  useEffect(() => {
    if (isMember) flash();
  }, [isMember, flash]);

  const articles = useMemo(() => published(manifest.articles).filter((a) => a.access === "members"), [manifest.articles]);
  const nights = useMemo(() => splitEvents(manifest.events).upcoming.filter((e) => e.access === "members"), [manifest.events]);
  const tierName = t.tiers[String(me?.tier ?? 0) as keyof typeof t.tiers];
  const walletDoorPending = isConnected && connector?.id !== CDP_CONNECTOR_ID && !signedIn;

  const errorText = (e: string | null) =>
    e === "identity_used" ? m.identity_used : e === "needs_social" ? m.needs_social : e === "not_configured" ? m.not_configured : e === "wallet_not_linked" ? m.wallet_not_linked : e === "bad_code" ? m.bad_code : e === "used_code" ? m.used_code : e ? m.error : null;

  return (
    <main>
      <section className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: 56, gap: 40 }}>
        <RuleRow left={<SplitText text={m.ts} />} right={me ? tierName : "—"} />
        <h1 className="display display--xl">{m.h}</h1>
        <ScrollReveal text={m.lede} />
      </section>

      {!isMember ? <Showcase preview={!members.available} tierName={t.tiers["2"]} /> : null}

      <section className="gutter wrap" style={{ paddingBottom: 72 }}>
        {!members.available ? (
          <Soon />
        ) : !signedIn ? (
          /* ---------------------------------------------------------- doors */
          <div className="doors">
            <Edge className="doors__main">
              <h2 className="slab-title">{m.door_social_t}</h2>
              <p className="lit-list__line">{m.door_social_p}</p>
              <div className="stack" style={{ gap: 10, paddingTop: 8 }}>
                {SOCIALS.map((p, i) => (
                  <button key={p} type="button" className={`btn btn--block ${i === 0 ? "btn--led" : ""}`} onClick={() => members.socialSignIn(p)}>
                    {m[p]}
                  </button>
                ))}
              </div>
            </Edge>

            <Edge quiet className="doors__side">
              <h2 className="slab-title" style={{ fontSize: "clamp(24px,2.4vw,32px)" }}>
                {m.door_wallet_t}
              </h2>
              <p className="lit-list__line">{m.door_wallet_p}</p>
              {walletDoorPending && connected ? (
                <>
                  <span className="eyebrow">{shortAddress(connected)}</span>
                  <button type="button" className="btn btn--block" onClick={members.walletSignIn} disabled={busy === "signing"}>
                    {busy === "signing" ? <Shiny text={m.loading} /> : m.wallet_sign}
                  </button>
                  <p className="eyebrow" style={{ lineHeight: 1.7, margin: 0 }}>
                    {m.sign_note}
                  </p>
                </>
              ) : (
                <button type="button" className="btn btn--block" onClick={connectWallet} disabled={pending}>
                  {m.connect}
                </button>
              )}
            </Edge>
          </div>
        ) : !me ? (
          <p className="eyebrow">
            <Shiny text={m.loading} />
          </p>
        ) : !isMember ? (
          /* ---------------------------------------------------------- link socials, claim */
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <Edge>
            {me.needsSocial ? (
              <>
                <h2 className="display" style={{ position: "relative", fontSize: "clamp(26px,3.2vw,36px)" }}>
                  {m.link_t}
                </h2>
                <p className="lede" style={{ position: "relative", fontSize: 16, margin: 0 }}>
                  {m.link_p}
                </p>
                <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {SOCIALS.map((p) => (
                    <button key={p} type="button" className="btn" onClick={() => members.linkSocial(p)}>
                      {m[p]}
                    </button>
                  ))}
                </div>
              </>
            ) : busy === "claiming" || busy === "checking" ? (
              <p className="display display--md center" aria-live="polite">
                <Shiny text={m.minting} />
              </p>
            ) : (
              <div className="stack" style={{ position: "relative", gap: 18 }}>
                {me.inviteOnly ? (
                  <>
                    <p className="lede" style={{ margin: 0 }}>
                      {m.code_hint}
                    </p>
                    <label className="field field--code eyebrow">
                      {m.code_label}
                      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VQ-XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} />
                    </label>
                  </>
                ) : null}
                {errorText(claimState ?? error) ? (
                  <p role="alert" className="caption-i" style={{ margin: 0 }}>
                    {errorText(claimState ?? error)}
                  </p>
                ) : null}
                {isConnected && connected && connector?.id !== CDP_CONNECTOR_ID && !me.wallets.includes(connected) ? (
                  <button type="button" className="btn" onClick={members.walletSignIn}>
                    {m.link_wallet} · {shortAddress(connected)}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn--led"
                  disabled={!me.configured || (me.inviteOnly && !code.trim())}
                  onClick={async () => setClaimState(await members.claim(me.inviteOnly ? normalizeCode(code) : undefined).then((r) => (r === "ok" ? null : r)))}
                >
                  {m.claim}
                </button>
              </div>
            )}
          </Edge>
          </div>
        ) : (
          /* ---------------------------------------------------------- member */
          <div className="stack" style={{ gap: 64 }}>
            <MembershipCard
              address={me.address!}
              tierName={tierName}
              socials={me.socials}
              lastTx={lastTx}
              labels={{ title: m.membership_t, token: m.token, linked: m.linked, wallet: m.wallet, tx: m.view_tx, gen: m.gen }}
            />

            <div className="stack" style={{ gap: 24 }}>
              <RuleRow left="I" right={m.articles} />
              {articles.length === 0 ? (
                <p className="caption-i">{m.none}</p>
              ) : (
                articles.map((a) => (
                  <Link key={a.id} href={`/diario/${a.slug}`} className="hairline-top" style={{ display: "grid", gridTemplateColumns: "minmax(120px,auto) 1fr", gap: 24, paddingTop: 18, alignItems: "baseline" }}>
                    <span className="eyebrow">{formatDate(a.publishedAt, lang)}</span>
                    <span className="stack" style={{ gap: 6 }}>
                      <span className="display" style={{ fontSize: "clamp(24px,2.6vw,32px)" }}>
                        {a.title[lang]}
                      </span>
                      <span className="lede" style={{ fontSize: 16 }}>
                        {a.excerpt[lang]}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>

            <div className="stack" style={{ gap: 24 }}>
              <RuleRow left="II" right={m.events} />
              {nights.length === 0 ? (
                <p className="caption-i">{m.none}</p>
              ) : (
                nights.map((ev) => (
                  <Link key={ev.id} href={`/eventos/${ev.slug}`} className="hairline-top" style={{ display: "grid", gridTemplateColumns: "minmax(160px,auto) 1fr auto", gap: 24, paddingTop: 18, alignItems: "baseline" }}>
                    <span className="eyebrow">{eventStamp(ev.startsAt, lang)}</span>
                    <span className="display" style={{ fontSize: "clamp(24px,2.6vw,32px)" }}>
                      {ev.title[lang]}
                    </span>
                    <span className="eyebrow">{ev.city}</span>
                  </Link>
                ))
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
              {me.needsSocial === false && me.socials.length < 3
                ? SOCIALS.filter((p) => !me.socials.some((s) => s.type === p)).map((p) => (
                    <button key={p} type="button" className="eyebrow hit" onClick={() => members.linkSocial(p)} style={{ background: "none", border: 0, cursor: "pointer", padding: 0, color: "var(--bone)" }}>
                      + {m[p]}
                    </button>
                  ))
                : null}
              <button type="button" className="eyebrow hit" onClick={members.signOut} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
                {m.signout}
              </button>
            </div>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

/** The pass, as a card. Holder shown as the linked account name, never as an address. */
function MembershipCard({
  tierName,
  socials,
  lastTx,
  labels,
}: {
  address: string;
  tierName: string;
  socials: { type: string; username: string | null }[];
  lastTx: string | null;
  labels: { title: string; token: string; linked: string; wallet: string; tx: string; gen: string };
}) {
  const holder = socials.find((s) => s.username)?.username;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: "clamp(24px,4vw,56px)", alignItems: "center" }}>
      <PassLanyard top={[`${labels.title} · ${tierName}`, labels.gen]} bottom={[holder ? `@${holder}` : tierName, labels.token]} height="min(70svh, 640px)" />
      <Slab size={460}><div className="kv">
        <div>
          <span className="eyebrow">{labels.linked}</span>
          <span className="v" style={{ fontSize: 16 }}>
            {socials.map((s) => (s.username ? `${s.type} · @${s.username}` : s.type)).join("  ") || "—"}
          </span>
        </div>
        {lastTx ? (
          <div>
            <span className="eyebrow">{labels.tx}</span>
            <a className="v" href={`${explorer}/tx/${lastTx}`} target="_blank" rel="noreferrer" style={{ fontSize: 16 }}>
              {labels.tx}
            </a>
          </div>
        ) : null}
      </div></Slab>
    </div>
  );
}

/**
 * The pitch, before you are in: the pass hanging on its strap (React Bits Lanyard), why it matters stamped
 * beside it, and everything it opens read under one moving light (React Bits SpotlightCard).
 */
function Showcase({ preview, tierName }: { preview: boolean; tierName: string }) {
  const { t } = useSite();
  const m = t.miembros;
  return (
    <section className="gutter wrap stack" style={{ paddingBottom: 88, gap: "clamp(56px,8vw,112px)" }}>
      <div className="pass-show">
        <div className="pass-show__hang">
          <PassLanyard top={[`${m.membership_t} · ${tierName}`, m.gen]} bottom={[m.card_holder, m.token]} />
        </div>
        <div className="pass-show__copy">
          <h2 className="display display--lg">{m.pass_h}</h2>
          <span className="gold-rule" aria-hidden />
          <p className="lede" style={{ margin: 0, maxWidth: "30em" }}>
            {m.pass_p}
          </p>
          <Seal text={`${m.token} · ${m.gen}`} size={148}>
            <span className={preview ? "flyer flyer--md gold-num" : "flyer flyer--md"}>01</span>
          </Seal>
        </div>
      </div>

      <div className="stack" style={{ gap: 28 }}>
        <RuleRow left={String(m.perks.length).padStart(2, "0")} right={m.perks_t} />
        <Slab size={620}>
          <ul className="lit-list">
            {m.perks.map(([h, p]) => (
              <li key={h}>
                <span className="lit-list__name">{h}</span>
                <p className="lit-list__line">{p}</p>
              </li>
            ))}
          </ul>
        </Slab>
      </div>
    </section>
  );
}

/** Before the contracts are live: not a dead end, a waiting room with two ways forward. */
function Soon() {
  const { t } = useSite();
  const m = t.miembros;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
    <Edge className="center">
      <span className="eyebrow soon-badge" style={{ alignSelf: "center" }}>
        {m.soon_badge} · {m.gen}
      </span>
      <h2 className="display" style={{ fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.06 }}>
        {m.soon_h}
      </h2>
      <p className="lede" style={{ margin: "0 auto", maxWidth: "32em" }}>
        {m.soon_p}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, paddingTop: 8 }}>
        <Link href="/eventos" className="btn">
          {m.soon_events}
        </Link>
        <Link href="/diario" className="btn">
          {m.soon_read}
        </Link>
      </div>
    </Edge>
    </div>
  );
}
