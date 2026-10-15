"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { MediaSlot } from "@velvique/content";
import { useSite } from "@/components/providers/SiteProvider";
import { mediaUrl } from "@/lib/media";
import { Poster } from "@/components/bits/Poster";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

/**
 * Every photo slot. Media comes from the Grove manifest (content/media.json or GROVE_MEDIA_URI); until the shoot
 * lands, the slot shows its shot-list line, so layouts are final today.
 * By default the photo is a React Bits card (TiltedCard + GlareHover, see bits/Poster). `flat` is for the two
 * places a card would be wrong: the full-screen photo inside the hero's iris, and prints already held by Stack.
 * A video slot (one with a `poster`) always renders flat: a silent loop that plays only while on screen.
 */
export function Evidence({
  slot,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  flat = false,
  caption,
  className,
  style,
  children,
}: {
  slot: MediaSlot;
  sizes?: string;
  priority?: boolean;
  flat?: boolean;
  /** The tag that follows the cursor; defaults to the photo's alt text. */
  caption?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const { media, lang } = useSite();
  const entry = media[slot];
  const src = mediaUrl(entry?.uri);
  const alt = entry?.alt[lang] ?? "";

  if (src && entry?.poster) {
    return (
      <div data-flash-photo data-slot={slot} className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--ink-raised)", ...style }}>
        <Clip src={src} poster={entry.poster} alt={alt} />
        {children}
      </div>
    );
  }

  if (!flat) {
    return (
      <div data-flash-photo data-slot={slot} className={className} style={{ position: "relative", width: "100%", height: "100%", ...style }}>
        <Poster src={src} alt={alt} caption={src ? (caption ?? alt) : undefined}>
          {src ? null : <Placeholder text={entry?.placeholder[lang] ?? slot} />}
          {children}
        </Poster>
      </div>
    );
  }

  return (
    <div data-flash-photo data-slot={slot} className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--ink-raised)", ...style }}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover" }} />
      ) : (
        <Placeholder text={entry?.placeholder[lang] ?? slot} />
      )}
      {children}
    </div>
  );
}

/** No sound, no controls (the files carry no audio track); reduced motion keeps the poster still. */
function Clip({ src, poster, alt }: { src: string; poster: string; alt: string }) {
  const still = useClientValue(prefersReducedMotion, false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? void v.play().catch(() => undefined) : v.pause()), { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, [still]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={alt}
      muted
      loop
      playsInline
      preload="none"
      draggable={false}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
    />
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div
      role="img"
      aria-label={text}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "end start",
        padding: 18,
        background:
          "#000",
        border: "1px solid var(--hairline)",
      }}
    >
      <span className="eyebrow" style={{ maxWidth: "26ch", lineHeight: 1.6 }}>
        {text}
      </span>
    </div>
  );
}
