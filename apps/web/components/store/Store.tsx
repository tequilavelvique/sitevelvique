"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUsdc } from "@velvique/pay";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { Edge } from "@/components/bits/Edge";
import { Poster } from "@/components/bits/Poster";
import { Seal } from "@/components/bits/Seal";
import { Count } from "@/components/bits/Count";
import { Logo } from "@/components/chrome/Logo";
import { Footer } from "@/components/chrome/Footer";
import { usePass, useSkus } from "@/lib/chain/hooks";
import { useWalletDoors } from "@/lib/chain/wallet";
import { env } from "@/lib/env";
import { useSkuMeta } from "./useSkuMeta";
import { Checkout, type SkuRow } from "./Checkout";

export function Store() {
  const { t } = useSite();
  const s = t.tienda;
  useClockLabel(t.nav.n5);
  const pass = usePass();
  const doors = useWalletDoors();
  const skus = useSkus();
  const [open, setOpen] = useState<SkuRow | null>(null);

  const locked = !pass.isConnected || pass.tier === 0;

  return (
    <main>
      <section className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 48 }}>
        <RuleRow left={s.ts} right={pass.tier ? t.tiers[String(pass.tier) as keyof typeof t.tiers] : ""} />
        <h1 className="display display--xl">{s.h}</h1>

        {!env.catalog ? (
          <p className="lede">{s.not_deployed}</p>
        ) : locked ? (
          <div style={{ width: "100%", maxWidth: 620, alignSelf: "center" }}>
          <Edge className="center">
            <Seal text={s.ts} size={120} style={{ alignSelf: "center" }}>
              <Logo height={10} />
            </Seal>
            <h2 className="slab-title">{s.locked_h}</h2>
            <p className="lede" style={{ maxWidth: "none" }}>
              {s.locked_p}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {!pass.isConnected ? (
                <button type="button" className="btn" onClick={doors.connectWallet} disabled={doors.pending}>
                  {s.connect}
                </button>
              ) : null}
              <Link href="/acceso" className="btn btn--led">
                {s.redeem}
              </Link>
            </div>
          </Edge>
          </div>
        ) : skus.isLoading ? null : !skus.data?.length ? (
          <p className="lede">{s.empty}</p>
        ) : (
          <div className="shelf">
            {skus.data
              .filter((row) => row.sku.active && row.sku.requiredTier <= pass.tier)
              .map((row) => (
                <SkuCard key={row.id.toString()} row={row} onBuy={() => setOpen(row)} />
              ))}
          </div>
        )}
      </section>

      {open ? <Checkout row={open} onClose={() => setOpen(null)} /> : null}
      <Footer />
    </main>
  );
}

/** A bottle on the shelf: React Bits BorderGlow card, the photo under the flash, the tier stamped on it, the count running down. */
function SkuCard({ row, onBuy }: { row: SkuRow; onBuy: () => void }) {
  const { t, lang, regionBit } = useSite();
  const s = t.tienda;
  const meta = useSkuMeta(row.sku.metadataURI || undefined);
  const left = row.sku.supplyCap ? row.sku.supplyCap - row.sku.sold : null;
  const soldOut = left !== null && left <= 0;
  const shipsHere = (row.sku.regionMask & (1 << regionBit)) !== 0;
  const name = meta.data?.name[lang] ?? `SKU ${row.id}`;
  const tier = t.tiers[String(row.sku.requiredTier) as keyof typeof t.tiers];
  const price = formatUsdc(row.sku.price, lang === "ES" ? "es-MX" : "en-US");

  return (
    <article className="shelf__item">
      <Edge>
        <div className="shelf__photo" data-flash-photo>
          <Poster src={meta.data?.imageUrl ?? null} alt={name} caption={price} />
          <Seal text={`${tier} · N.º ${row.id}`} size={96} className="shelf__seal">
            <span className="eyebrow" style={{ color: "var(--bone)" }}>
              {String(row.id).padStart(2, "0")}
            </span>
          </Seal>
        </div>
        <h2 className="slab-title">{name}</h2>
        {meta.data?.description ? <p className="lit-list__line">{meta.data.description[lang]}</p> : null}
        <div className="shelf__facts">
          <span className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">{s.price}</span>
            <span className="flyer flyer--md">{price}</span>
          </span>
          <span className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
            <span className="eyebrow">{left === null ? s.limit : s.left}</span>
            <span className="flyer flyer--md">{left === null ? row.sku.perWallet || "—" : <Count to={Math.max(0, left)} />}</span>
          </span>
        </div>
        {!shipsHere ? <p className="caption-i" style={{ margin: 0 }}>{s.region_blocked}</p> : null}
        <button type="button" className="btn btn--block" onClick={onBuy} disabled={soldOut || !shipsHere}>
          {soldOut ? s.soldout : s.buy}
        </button>
      </Edge>
    </article>
  );
}
