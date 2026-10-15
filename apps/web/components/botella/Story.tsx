"use client";

import { useEffect, useRef } from "react";
import type { MediaSlot } from "@velvique/content";
import { useSite } from "@/components/providers/SiteProvider";
import { NightSection } from "@/components/motion/NightSection";
import { BlurText } from "@/components/bits/BlurText";
import { Evidence } from "@/components/ui/Evidence";
import { RuleRow } from "@/components/ui/primitives";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";
import { mediaUrl } from "@/lib/media";

/** Evidence per chapter, in order (I..VIII); IV and V (learning the trade, the craft) stand on text alone. */
const CHAPTER_MEDIA: (MediaSlot | null)[] = ["vq-story-festival", "vq-story-idea", "vq-story-cap", null, null, "vq-story-launch", "vq-story-night", "vq-story-toast"];

/**
 * The bottle's story, the brand's source of truth: the client's text verbatim (EN) and translated (ES), one paragraph
 * per chapter. Anything else on the site that disagrees with it is what gets fixed.
 */
export function Story() {
  const { t } = useSite();
  const b = t.botella;

  return (
    <NightSection time="4:10 AM" label="Historia" className="gutter section wrap stack" style={{ gap: "clamp(56px,8vw,112px)" }}>
      <div className="story-ch">
        <div className="stack story-ch__text" style={{ gap: 28 }}>
          <RuleRow left="Velvique" right={b.story_t} />
          <h2 className="display display--lg" style={{ maxWidth: "16em" }}>
            {b.story_h}
          </h2>
          <span className="gold-rule" aria-hidden />
          <BlurText text={b.story_p} className="lede" style={{ fontSize: "clamp(18px,1.8vw,22px)" }} />
        </div>
        <div className="story-ch__media" style={{ aspectRatio: "3/4", position: "relative" }}>
          <Evidence slot="vq-story-amigos" />
        </div>
      </div>

      <ol className="story">
        {b.story.map(([n, place, h, p], i) => {
          const slot = CHAPTER_MEDIA[i] ?? null;
          return (
            <li key={n} className="story-ch">
              <div className="stack story-ch__text" style={{ gap: 18 }}>
                <span className="eyebrow">
                  <span className="gold-num">{n}</span> · {place}
                </span>
                <h3 className="display display--md">{h}</h3>
                <p className="lede" style={{ margin: 0 }}>
                  {p}
                </p>
              </div>
              {slot ? (
                <div className="story-ch__media" style={{ position: "relative" }}>
                  <StoryMedia slot={slot} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="lede hairline-gold" style={{ margin: 0, paddingTop: 24, maxWidth: "38em", fontSize: "clamp(18px,1.8vw,22px)" }}>
        {b.story_end}
      </p>
    </NightSection>
  );
}

/**
 * A video slot plays in a loop while on screen, never with sound: the files carry no audio track and there are no
 * controls (reduced motion shows the poster still). A photo slot is the usual Evidence card.
 */
function StoryMedia({ slot }: { slot: MediaSlot }) {
  const { media, lang } = useSite();
  const entry = media[slot];
  const still = useClientValue(prefersReducedMotion, false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? void v.play().catch(() => undefined) : v.pause()), { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [still]);

  if (!entry.poster) {
    return (
      <div style={{ aspectRatio: "3/4", position: "relative" }}>
        <Evidence slot={slot} />
      </div>
    );
  }
  return (
    <video
      ref={ref}
      src={mediaUrl(entry.uri) ?? undefined}
      poster={entry.poster}
      aria-label={entry.alt[lang]}
      muted
      loop
      playsInline
      preload="none"
    />
  );
}
