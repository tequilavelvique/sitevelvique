"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArticleEntry } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { Edge } from "@/components/bits/Edge";
import { Poster } from "@/components/bits/Poster";

/** "Crónica · 4 oct 2026" — the kind and the date, the first line of every post. */
export function KindDate({ a }: { a: ArticleEntry }) {
  const { t, lang } = useSite();
  return (
    <span className="eyebrow">
      {a.kind ? <span className="gold-num">{t.diario.kinds[a.kind]}</span> : null}
      {a.kind ? " · " : ""}
      {formatDate(a.publishedAt, lang)}
    </span>
  );
}

/** "Por Redacción Velvique · 3 min" */
export function Byline({ a, minutes }: { a: ArticleEntry; minutes?: number }) {
  const { t } = useSite();
  const m = minutes ?? a.minutes;
  if (!a.author && !m) return null;
  return (
    <span className="eyebrow">
      {a.author ? `${t.diario.by} ${a.author}` : ""}
      {a.author && m ? " · " : ""}
      {m ? `${m} ${t.diario.min}` : ""}
    </span>
  );
}

/** Substack-style row: text on the left, a small photo on the right when the post has one. */
export function PostRow({ a, hidden = false }: { a: ArticleEntry; hidden?: boolean }) {
  const { t, lang } = useSite();
  const cover = mediaUrl(a.cover);
  return (
    <article data-card data-flip-id={a.id} className="hairline-top" style={{ display: hidden ? "none" : "block" }}>
      <Link href={`/diario/${a.slug}`} className="post-row">
        <span className="stack" style={{ gap: 10, minWidth: 0 }}>
          <KindDate a={a} />
          <span className="display post-row__title">{a.title[lang]}</span>
          <span className="lede post-row__excerpt">{a.excerpt[lang]}</span>
          <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Byline a={a} />
            {a.access === "members" ? <span className="badge badge--members">{t.diario.members_badge}</span> : null}
          </span>
        </span>
        {cover ? (
          <span className="post-row__thumb">
            <Poster src={cover} alt={a.title[lang]} />
          </span>
        ) : null}
      </Link>
    </article>
  );
}

/** Subscribe, the Velvique way: membership is the subscription, the wallet is the inbox. */
export function SubscribeBox() {
  const { t } = useSite();
  const d = t.diario;
  return (
    <aside>
      <Edge quiet>
        <div className="subscribe">
          <div className="stack" style={{ gap: 10 }}>
            <span className="slab-title">{d.sub_t}</span>
            <p className="lit-list__line">{d.sub_p}</p>
          </div>
          <Link href="/miembros" className="btn" style={{ justifySelf: "start" }}>
            {d.sub_cta}
          </Link>
        </div>
      </Edge>
    </aside>
  );
}

/** Copy link, X and WhatsApp. No tracking pixels, no third-party scripts: plain links. */
export function ShareBar({ title }: { title: string }) {
  const { t } = useSite();
  const d = t.diario;
  const [copied, setCopied] = useState(false);
  const here = () => (typeof window === "undefined" ? "" : window.location.href);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(here());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the links below still work */
    }
  };
  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="eyebrow" style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
      <span>{d.share}</span>
      <button type="button" className="eyebrow hit share-btn" onClick={copy} aria-live="polite">
        {copied ? d.copied : d.copy_link}
      </button>
      <button type="button" className="eyebrow hit share-btn" onClick={() => open(`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(here())}`)}>
        X
      </button>
      <button type="button" className="eyebrow hit share-btn" onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${title} ${here()}`)}`)}>
        WhatsApp
      </button>
    </div>
  );
}
