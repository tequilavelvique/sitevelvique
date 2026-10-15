"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MediaSlot } from "@velvique/content";
import { splitEvents, type ArchivePhoto } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { NightSection } from "@/components/motion/NightSection";
import { SplitText } from "@/components/bits/SplitText";
import { BlurText } from "@/components/bits/BlurText";
import { ScrollVelocity } from "@/components/bits/ScrollVelocity";
import { Masonry, type MasonryPhoto } from "@/components/bits/Masonry";
import { Evidence } from "@/components/ui/Evidence";
import { Meme, RuleRow } from "@/components/ui/primitives";
import { Footer } from "@/components/chrome/Footer";
import { EASE, Flip, gsap, prefersReducedMotion } from "@/lib/gsap";
import { eventStamp } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { PassTheBottle, type PassTarget } from "./PassTheBottle";

/** Shot-list placeholders shown until the admin uploads the first archive photos to Grove. */
const SLOTS: MediaSlot[] = ["vq-after-1", "vq-flash-01", "vq-after-2", "vq-after-3", "vq-pour", "vq-after-4", "vq-led-table", "vq-dawn"];

export function ElAfter() {
  const { t, lang, manifest } = useSite();
  const a = t.after;
  const pass = useRef<PassTarget>(null);
  const [open, setOpen] = useState<ArchivePhoto | null>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const overlay = useRef<HTMLDivElement>(null);

  const photos = manifest.archive;
  const items = useMemo<MasonryPhoto[]>(
    () => photos.map((p) => ({ id: p.id, img: mediaUrl(p.uri) ?? "", url: mediaUrl(p.uri) ?? "", height: Math.round((p.h / p.w) * 600) })),
    [photos],
  );
  const upcoming = useMemo(() => splitEvents(manifest.events).upcoming.slice(0, 4), [manifest.events]);

  // Lightbox: GSAP Flip from the clicked frame to full screen.
  const openPhoto = (item: MasonryPhoto, el: HTMLElement) => {
    el.setAttribute("data-flip-id", `ph-${item.id}`);
    if (!prefersReducedMotion()) flipState.current = Flip.getState(el);
    setOpen(photos.find((p) => p.id === item.id) ?? null);
  };

  useLayoutEffect(() => {
    if (!open || !overlay.current) return;
    const frame = overlay.current.querySelector<HTMLElement>("[data-flip-id]");
    if (flipState.current && frame) {
      Flip.from(flipState.current, { targets: frame, duration: 0.75, ease: EASE.drift, absolute: true, scale: true });
      gsap.fromTo(overlay.current, { backgroundColor: "rgba(8,8,10,0)" }, { backgroundColor: "rgba(8,8,10,0.96)", duration: 0.5 });
    }
    flipState.current = null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <main>
      <NightSection time="2:10 AM" label="El after" className="gutter wrap stack" style={{ paddingTop: 120, gap: 32 }}>
        <RuleRow left="III" right={<SplitText text={a.ts} />} />
        <h1 className="display display--xl center">{a.h}</h1>
        <BlurText text={a.p} className="lede center" style={{ margin: "0 auto" }} />
      </NightSection>

      <div style={{ paddingBlock: 48 }}>
        <ScrollVelocity items={t.memes.map(([x, y]) => `${x} / ${y}`)} />
      </div>

      <NightSection time="3:15 AM" label="Archivo" className="gutter wrap--wide" style={{ position: "relative", paddingBottom: "var(--section)" }}>
        <PassTheBottle ref={pass} />
        {items.length ? (
          <div
            onPointerOver={(e) => {
              const frame = (e.target as HTMLElement).closest<HTMLElement>(".item-wrapper");
              if (frame) pass.current?.moveTo(frame);
            }}
          >
            <Masonry items={items} onOpen={openPhoto} />
          </div>
        ) : (
          <div style={{ columnWidth: "clamp(240px, 28vw, 360px)", columnGap: "clamp(14px,2vw,28px)" }}>
            {SLOTS.map((slot, i) => (
              <div
                key={slot}
                style={{ breakInside: "avoid", marginBottom: "clamp(14px,2vw,28px)", aspectRatio: i % 3 === 0 ? "3/4" : "4/5", position: "relative" }}
                onPointerEnter={(e) => pass.current?.moveTo(e.currentTarget)}
              >
                <Evidence slot={slot}>{i === 0 ? <Meme lines={t.memes[0] ?? []} /> : null}</Evidence>
              </div>
            ))}
          </div>
        )}
      </NightSection>

      <NightSection time="5:30 AM" label="Próximas" className="gutter section wrap stack" style={{ gap: 32 }}>
        <RuleRow left="VI" right={a.events_t} />
        {upcoming.length ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {upcoming.map((e) => (
              <li key={e.id} className="hairline-top">
                <Link href={`/eventos/${e.slug}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 12, padding: "20px 0", alignItems: "baseline" }}>
                  <span className="eyebrow">{eventStamp(e.startsAt, lang)}</span>
                  <span style={{ fontSize: 22 }}>{e.title[lang]}</span>
                  <span className="eyebrow">{e.city}</span>
                  {e.access === "members" ? <span className="badge badge--members">{t.eventos.members_badge}</span> : <span />}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption-i center">{a.events_empty}</p>
        )}
        <Link href="/eventos" className="eyebrow hit" style={{ color: "var(--bone)" }}>
          {t.nav.n10} &rarr;
        </Link>
      </NightSection>

      {open ? (
        <div
          ref={overlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, zIndex: 58, background: "rgba(8,8,10,0.96)", display: "grid", placeItems: "center", padding: "6vh 4vw", cursor: "zoom-out" }}
          data-lenis-prevent
        >
          <div data-flip-id={`ph-${open.id}`} style={{ position: "relative", width: `min(92vw, ${(open.w / open.h) * 86}vh)`, aspectRatio: `${open.w}/${open.h}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(open.uri) ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            {open.meme ? <Meme lines={open.meme} /> : null}
            {open.time ? (
              <span className="eyebrow" style={{ position: "absolute", right: 0, bottom: -28 }}>
                {open.time}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <Footer />
    </main>
  );
}
