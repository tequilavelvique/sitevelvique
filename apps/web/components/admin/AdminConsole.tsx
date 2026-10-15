"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SiteManifest } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { useMembers } from "@/components/providers/MembersProvider";
import { RuleRow } from "@/components/ui/primitives";
import { useWalletDoors } from "@/lib/chain/wallet";
import { bootstrapManifest, readManifest } from "@/lib/admin";
import { env } from "@/lib/env";
import { shortAddress } from "@/lib/media";
import { ArticlesAdmin } from "./ArticlesAdmin";
import { EventsAdmin } from "./EventsAdmin";
import { ArchiveAdmin } from "./ArchiveAdmin";
import { MediaAdmin } from "./MediaAdmin";
import { MembersAdmin } from "./MembersAdmin";

type Tab = "articles" | "events" | "archive" | "media" | "members";

/**
 * /admin. Gate: admin wallet connected over WalletConnect (EOA) + SIWE into the Coinbase identity layer (lets the
 * admin open sealed members content for editing). Every content change is a Grove edit signed by this wallet.
 */
export function AdminConsole() {
  const { t } = useSite();
  const a = t.admin;
  useClockLabel(a.ts);
  const { address, isConnected, connectWallet, pending } = useWalletDoors();
  const { signedIn, me, walletSignIn, busy } = useMembers();
  const [manifest, setManifest] = useState<SiteManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("articles");

  const isAdmin = Boolean(address && env.admins.includes(address));

  useEffect(() => {
    if (!isAdmin || !env.groveSiteUri) return;
    readManifest()
      .then(setManifest)
      .catch((e: Error) => setLoadError(e.message));
  }, [isAdmin]);

  const shell = (children: ReactNode) => (
    <main className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: 120, gap: 36, minHeight: "100svh" }}>
      <RuleRow left={a.ts} right={address ? shortAddress(address) : "—"} />
      <h1 className="display display--lg">{a.h}</h1>
      {children}
    </main>
  );

  if (!isConnected || !address) {
    return shell(
      <button type="button" className="btn btn--led" style={{ alignSelf: "flex-start" }} onClick={connectWallet} disabled={pending}>
        {a.connect}
      </button>,
    );
  }
  if (!isAdmin) return shell(<p className="lede">{a.not_admin}</p>);

  if (!env.groveSiteUri) {
    return shell(
      <div className="card stack" style={{ gap: 16, maxWidth: 640 }}>
        <h2 className="display" style={{ fontSize: 32 }}>
          {a.no_manifest_h}
        </h2>
        <p className="lede" style={{ fontSize: 16 }}>
          {a.no_manifest_p}
        </p>
        {created ? (
          <>
            <span className="eyebrow">NEXT_PUBLIC_GROVE_SITE_URI</span>
            <code style={{ wordBreak: "break-all", fontSize: 16 }}>{created}</code>
          </>
        ) : (
          <button type="button" className="btn btn--led" style={{ alignSelf: "flex-start" }} onClick={() => bootstrapManifest(address).then(setCreated)}>
            {a.create_manifest}
          </button>
        )}
      </div>,
    );
  }

  // Admin signs into the same Coinbase identity layer with SIWE (wallet door), so it can open sealed drafts.
  if (!signedIn || !me) {
    return shell(
      <div className="stack" style={{ gap: 14, maxWidth: 520 }}>
        <button type="button" className="btn btn--led" style={{ alignSelf: "flex-start" }} onClick={walletSignIn} disabled={busy === "signing"}>
          {t.miembros.wallet_sign}
        </button>
        <p className="eyebrow" style={{ lineHeight: 1.7 }}>
          {a.sign_note}
        </p>
      </div>,
    );
  }

  if (loadError) return shell(<p className="caption-i">{loadError}</p>);
  if (!manifest) return shell(<p className="eyebrow">{t.miembros.loading}</p>);

  const tabs: [Tab, string][] = [
    ["articles", a.tab_articles],
    ["events", a.tab_events],
    ["archive", a.tab_archive],
    ["media", a.tab_media],
    ["members", a.tab_members],
  ];

  return shell(
    <>
      <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" className="pill" onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <p className="eyebrow">{a.sign_note}</p>
      <div role="tabpanel">
        {tab === "articles" ? <ArticlesAdmin admin={address} manifest={manifest} onSaved={setManifest} /> : null}
        {tab === "events" ? <EventsAdmin admin={address} manifest={manifest} onSaved={setManifest} /> : null}
        {tab === "archive" ? <ArchiveAdmin admin={address} manifest={manifest} onSaved={setManifest} /> : null}
        {tab === "media" ? <MediaAdmin admin={address} manifest={manifest} onSaved={setManifest} /> : null}
        {tab === "members" ? <MembersAdmin admin={address} /> : null}
      </div>
      <div className="eyebrow hairline-top" style={{ paddingTop: 14, wordBreak: "break-all" }}>
        {a.manifest_uri}: {env.groveSiteUri}
      </div>
    </>,
  );
}
