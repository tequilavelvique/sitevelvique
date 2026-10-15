"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { published, type ArticleEntry, type ArticleKind } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { ScrollReveal } from "@/components/bits/ScrollReveal";
import { SplitText } from "@/components/bits/SplitText";
import { Footer } from "@/components/chrome/Footer";
import { Poster } from "@/components/bits/Poster";
import { Slab } from "@/components/bits/Slab";
import { EASE, Flip, gsap, prefersReducedMotion } from "@/lib/gsap";
import { mediaUrl } from "@/lib/media";
import { Byline, KindDate, PostRow, SubscribeBox } from "./parts";

/**
 * `/diario`: the journal index, read like a publication. The latest post leads, then a subscribe line
 * (membership is the subscription), then every post as a row. Kind filter animates with GSAP Flip.
 */
export function Journal() {
  const { t, manifest } = useSite();
  const d = t.diario;
  useClockLabel(d.ts);
  const items = useMemo(() => published(manifest.articles), [manifest.articles]);
  const kinds = useMemo(() => [...new Set(items.map((a) => a.kind).filter((k): k is ArticleKind => !!k))], [items]);
  const [kind, setKind] = useState<ArticleKind | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  const [lead, ...rest] = items;
  const rows = kind ? items : rest;

  const choose = (next: ArticleKind | null) => {
    if (list.current && !prefersReducedMotion()) flipState.current = Flip.getState(list.current.querySelectorAll("[data-card]"));
    setKind(next);
  };

  useLayoutEffect(() => {
    if (!flipState.current) return;
    Flip.from(flipState.current, {
      duration: 0.6,
      ease: EASE.drift,
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE.develop }),
      onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.25 }),
    });
    flipState.current = null;
  }, [kind]);

  return (
    <main>
      <section className="gutter stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 48, maxWidth: 1080, margin: "0 auto" }}>
        <RuleRow left={<SplitText text={d.ts} />} right={String(items.length).padStart(2, "0")} />
        <div className="stack" style={{ gap: 20 }}>
          <h1 className="display display--xl">{d.h}</h1>
          <span className="gold-rule" aria-hidden />
          <ScrollReveal text={d.lede} />
        </div>

        {items.length === 0 ? (
          <p className="caption-i">{d.empty}</p>
        ) : (
          <>
            {lead && !kind ? <Lead a={lead} label={d.latest} /> : null}
            <SubscribeBox />

            <div className="stack" style={{ gap: 20 }}>
              <span className="eyebrow">{d.archive}</span>
              {kinds.length > 1 ? (
                <div role="group" aria-label={d.all} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" className="pill" aria-pressed={kind === null} onClick={() => choose(null)}>
                    {d.all}
                  </button>
                  {kinds.map((k) => (
                    <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => choose(k)}>
                      {d.kinds[k]}
                    </button>
                  ))}
                </div>
              ) : null}
              <Slab size={640}>
                <div ref={list} className="stack">
                  {rows.map((a) => (
                    <PostRow key={a.id} a={a} hidden={kind !== null && a.kind !== kind} />
                  ))}
                </div>
              </Slab>
            </div>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}

/** The newest post, large: photo and headline side by side, or headline alone when there is no photo. */
function Lead({ a, label }: { a: ArticleEntry; label: string }) {
  const { lang } = useSite();
  const cover = mediaUrl(a.cover);
  return (
    <article className="stack" style={{ gap: 18 }}>
      <span className="eyebrow">{label}</span>
      <Link href={`/diario/${a.slug}`} style={{ display: "grid", gridTemplateColumns: cover ? "repeat(auto-fit,minmax(min(100%,380px),1fr))" : "1fr", gap: "clamp(24px,4vw,56px)", alignItems: "center" }}>
        {cover ? (
          <span data-flash-photo style={{ position: "relative", display: "block", aspectRatio: "4/5" }}>
            <Poster src={cover} alt={a.title[lang]} caption={label} />
          </span>
        ) : null}
        <span className="stack" style={{ gap: 16 }}>
          <KindDate a={a} />
          <span className="display" style={{ fontSize: "clamp(34px,4.4vw,60px)", lineHeight: 1.04 }}>
            {a.title[lang]}
          </span>
          <span className="lede" style={{ fontSize: "clamp(17px,1.6vw,20px)" }}>
            {a.excerpt[lang]}
          </span>
          <Byline a={a} />
        </span>
      </Link>
    </article>
  );
}
