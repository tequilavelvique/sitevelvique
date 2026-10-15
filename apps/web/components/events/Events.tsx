"use client";

import Link from "next/link";
import { useMemo } from "react";
import { splitEvents, type EventEntry } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { NightSection } from "@/components/motion/NightSection";
import { RuleRow } from "@/components/ui/primitives";
import { SplitText } from "@/components/bits/SplitText";
import { Footer } from "@/components/chrome/Footer";
import { Slab } from "@/components/bits/Slab";
import { Poster } from "@/components/bits/Poster";
import { dateParts, eventStamp, nightTime } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

/** `/eventos`: upcoming nights first, then the ones that already happened. From the Grove manifest. */
export function Events() {
  const { t, lang, manifest } = useSite();
  const e = t.eventos;
  useClockLabel(e.ts);
  const { upcoming, past } = useMemo(() => splitEvents(manifest.events), [manifest.events]);

  return (
    <main>
      <section className="gutter wrap stack" style={{ paddingTop: 120, gap: 40 }}>
        <RuleRow left={<SplitText text={e.ts} />} right={e.upcoming} />
        <h1 className="display display--xl">{e.h}</h1>
      </section>

      <NightSection time="10:00 PM" label="Próximas" className="gutter wrap stack" style={{ paddingBlock: 56, gap: "clamp(20px,3vw,36px)" }}>
        {upcoming.length === 0 ? <p className="caption-i">{e.empty}</p> : upcoming.map((ev) => <EventRow key={ev.id} ev={ev} lang={lang} />)}
      </NightSection>

      {past.length ? (
        <NightSection time="6:12 AM" label="Pasadas" className="gutter wrap stack" style={{ paddingBottom: "var(--section)", gap: 32 }}>
          <RuleRow left={String(past.length).padStart(2, "0")} right={e.past} />
          <Slab size={620}>
            <ul className="lit-list">
              {past.map((ev) => {
                const d = dateParts(ev.startsAt, lang);
                return (
                  <li key={ev.id}>
                    <Link href={`/eventos/${ev.slug}`} className="past-night">
                      <span className="flyer flyer--md">
                        {d.day} {d.month}
                      </span>
                      <span className="lit-list__name">{ev.title[lang]}</span>
                      <span className="eyebrow">{ev.city}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Slab>
        </NightSection>
      ) : null}
      <Footer />
    </main>
  );
}

/** An upcoming night as a lit flyer: the date at poster size, the poster under the flash, the night beside it. */
function EventRow({ ev, lang }: { ev: EventEntry; lang: "ES" | "EN" }) {
  const { t } = useSite();
  const cover = mediaUrl(ev.cover);
  const d = dateParts(ev.startsAt, lang);
  return (
    <Link href={`/eventos/${ev.slug}`} className="night-flyer">
      <Slab size={520}>
        <div className="night-flyer__grid">
          <div className="night-flyer__date" aria-label={eventStamp(ev.startsAt, lang)}>
            <span className="eyebrow">{d.weekday}</span>
            <span className="flyer flyer--xl">{d.day}</span>
            <span className="flyer flyer--md">{d.month}</span>
            <span className="eyebrow" style={{ paddingTop: 10 }}>
              {nightTime(ev.startsAt)}
            </span>
          </div>
          <div className="night-flyer__poster">
            {cover ? <Poster src={cover} alt={ev.title[lang]} caption={ev.venue} /> : <span className="night-flyer__blank" aria-hidden />}
          </div>
          <div className="night-flyer__copy">
            <span className="slab-title">{ev.title[lang]}</span>
            <span className="lit-list__line">{ev.summary[lang]}</span>
            <span className="night-flyer__where">
              <span style={{ fontSize: 18 }}>{ev.venue}</span>
              <span className="eyebrow">{ev.city}</span>
            </span>
            <span style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", paddingTop: 6 }}>
              {ev.access === "members" ? <span className="badge badge--members">{t.eventos.members_badge}</span> : null}
              <span className="eyebrow night-flyer__see">{t.eventos.see}</span>
            </span>
          </div>
        </div>
      </Slab>
    </Link>
  );
}
