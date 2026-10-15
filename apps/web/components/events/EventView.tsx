"use client";

import Link from "next/link";
import type { EventEntry } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { Glow, RuleRow } from "@/components/ui/primitives";
import { SplitText } from "@/components/bits/SplitText";
import { Slab } from "@/components/bits/Slab";
import { Footer } from "@/components/chrome/Footer";
import { MembersGate } from "@/components/members/MembersGate";
import { Markdown } from "@/lib/markdown";
import { dateParts, eventStamp, nightTime } from "@/lib/format";
import { Poster } from "@/components/bits/Poster";
import { mediaUrl } from "@/lib/media";

type Private = { private: { ES: string; EN: string; address?: string } | null };

export function EventView({ entry, body, hasPrivate }: { entry: EventEntry; body: { ES: string; EN: string } | null; hasPrivate: boolean }) {
  const { t, lang } = useSite();
  const e = t.eventos;
  useClockLabel(nightTime(entry.startsAt) || e.ts);
  const cover = mediaUrl(entry.cover);

  return (
    <main>
      <article className="gutter stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 40, maxWidth: 1000, margin: "0 auto" }}>
        <RuleRow left={<Link href="/eventos">{e.ts}</Link>} right={entry.city} />
        <SplitText text={entry.title[lang]} as="h1" splitType="words" className="display display--xl" stagger={60} />

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "clamp(28px,4vw,56px)", alignItems: "start" }}>
          <div data-flash-photo style={{ position: "relative", aspectRatio: "4/5" }}>
            {cover ? (
              <Poster src={cover} alt={entry.title[lang]} caption={`${entry.venue} · ${entry.city}`}>
                <span className="poster-date">
                  <span className="flyer flyer--lg">{dateParts(entry.startsAt, lang).day}</span>
                  <span className="flyer flyer--md">{dateParts(entry.startsAt, lang).month}</span>
                </span>
              </Poster>
            ) : (
              <Glow size="70%" opacity={0.4} />
            )}
          </div>
          <div className="stack" style={{ gap: 28 }}>
            <Slab size={460}><div className="kv">
              <div>
                <span className="eyebrow">{e.when}</span>
                <span className="v">{eventStamp(entry.startsAt, lang)}</span>
              </div>
              <div>
                <span className="eyebrow">{e.where}</span>
                <span className="v">
                  {entry.venue} · {entry.city}
                </span>
              </div>
            </div></Slab>
            <p className="lede">{entry.summary[lang]}</p>
            {body ? <Markdown source={body[lang]} /> : null}
          </div>
        </div>

        {hasPrivate ? (
          <MembersGate<Private> kind="event" id={entry.id} title={e.details_t} body={e.details_locked}>
            {(data) =>
              data.private ? (
                <Slab size={480}>
                  <div className="stack" style={{ gap: 18 }}>
                    <span className="badge badge--members" style={{ alignSelf: "flex-start" }}>
                      {e.details_t}
                    </span>
                    {data.private.address ? <p className="slab-title" style={{ margin: 0 }}>{data.private.address}</p> : null}
                    <Markdown source={data.private[lang]} />
                  </div>
                </Slab>
              ) : null
            }
          </MembersGate>
        ) : null}

        <Link href="/eventos" className="eyebrow hit" style={{ color: "var(--bone)" }}>
          &larr; {e.back}
        </Link>
      </article>
      <Footer />
    </main>
  );
}
