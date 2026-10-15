"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { MediaSlot } from "@velvique/content";
import { useSite } from "@/components/providers/SiteProvider";
import { mediaUrl } from "@/lib/media";
import { Poster } from "@/components/bits/Poster";

/**
 * Every photo slot. Media comes from the Grove manifest (content/media.json or GROVE_MEDIA_URI); until the shoot
 * lands, the slot shows its shot-list line, so layouts are final today.
 * By default the photo is a React Bits card (TiltedCard + GlareHover, see bits/Poster). `flat` is for the two
 * places a card would be wrong: the full-screen photo inside the hero's iris, and prints already held by Stack.
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
