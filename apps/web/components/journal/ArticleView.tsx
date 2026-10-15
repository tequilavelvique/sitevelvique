"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Poster } from "@/components/bits/Poster";
import { Slab } from "@/components/bits/Slab";
import { published, type ArticleEntry } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { SplitText } from "@/components/bits/SplitText";
import { BlurText } from "@/components/bits/BlurText";
import { Footer } from "@/components/chrome/Footer";
import { MembersGate } from "@/components/members/MembersGate";
import { Markdown, readingMinutes } from "@/lib/markdown";
import { mediaUrl } from "@/lib/media";
import { Byline, KindDate, PostRow, ShareBar, SubscribeBox } from "./parts";

export function ArticleView({ entry, body }: { entry: ArticleEntry; body: { ES: string; EN: string } | null }) {
  const { t, lang, manifest } = useSite();
  const d = t.diario;
  useClockLabel(d.ts);
  const cover = mediaUrl(entry.cover);
  const minutes = body ? readingMinutes(body[lang]) : entry.minutes;

  // Keep reading: same kind first, then the newest of the rest. Three, never this one.
  const more = useMemo(() => {
    const others = published(manifest.articles).filter((a) => a.id !== entry.id);
    const same = others.filter((a) => entry.kind && a.kind === entry.kind);
    return [...same, ...others.filter((a) => !same.includes(a))].slice(0, 3);
  }, [manifest.articles, entry.id, entry.kind]);

  return (
    <main>
      <article className="gutter stack" style={{ paddingTop: 120, paddingBottom: 64, gap: 36, maxWidth: 900, margin: "0 auto" }}>
        <RuleRow left={<Link href="/diario">{d.ts}</Link>} right={<KindDate a={entry} />} />
        {entry.access === "members" ? <span className="badge badge--members" style={{ alignSelf: "flex-start" }}>{d.members_badge}</span> : null}
        <SplitText text={entry.title[lang]} as="h1" splitType="words" className="display display--xl" stagger={60} />
        <BlurText text={entry.excerpt[lang]} className="lede" style={{ fontSize: "clamp(19px,2vw,24px)" }} />

        <div className="hairline-top" style={{ paddingTop: 16, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 14 }}>
          <Byline a={entry} minutes={minutes} />
          <ShareBar title={entry.title[lang]} />
        </div>

        {cover ? (
          <div data-flash-photo style={{ position: "relative", aspectRatio: "4/5", maxHeight: "86svh", width: "100%" }}>
            <Poster src={cover} alt={entry.title[lang]} />
          </div>
        ) : null}

        {entry.access === "public" ? (
          body ? <Markdown source={body[lang]} /> : null
        ) : (
          <MembersGate<{ body: { ES: string; EN: string } }> kind="article" id={entry.id} title={d.locked_h} body={d.locked_p}>
            {(data) => <Markdown source={data.body[lang]} />}
          </MembersGate>
        )}

        {entry.tags.length ? (
          <div className="eyebrow hairline-top" style={{ display: "flex", flexWrap: "wrap", gap: 16, paddingTop: 18 }}>
            {entry.tags.map((tg) => (
              <span key={tg}>{tg}</span>
            ))}
          </div>
        ) : null}

        <ShareBar title={entry.title[lang]} />
        <SubscribeBox />
      </article>

      {more.length ? (
        <section className="gutter stack" style={{ paddingBottom: "var(--section)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
          <span className="eyebrow">{d.more}</span>
          <Slab size={640}>
            <div className="stack">
              {more.map((a) => (
                <PostRow key={a.id} a={a} />
              ))}
            </div>
          </Slab>
          <Link href="/diario" className="eyebrow hit" style={{ color: "var(--bone)", paddingTop: 12 }}>
            &larr; {d.back}
          </Link>
        </section>
      ) : null}
      <Footer />
    </main>
  );
}
