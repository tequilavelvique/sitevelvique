"use client";

import type { ReactNode } from "react";
import RBTiltedCard from "@/components/reactbits/TiltedCard/TiltedCard";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";
import { Flash } from "./Flash";

/** A 1x1 transparent pixel: TiltedCard needs an image even while a slot waits for its photo. */
const EMPTY = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Every photo on the site: React Bits TiltedCard (the print leans toward your hand, a small ivory tag follows
 * the cursor with the caption) with React Bits GlareHover on top (one camera-flash pass when you reach for it).
 * Whatever sits on the photo (a meme, a date, a seal) rides the card in relief. Flat for reduced motion.
 */
export function Poster({ src, alt, caption, children, height = "100%" }: { src: string | null; alt: string; caption?: string; children?: ReactNode; height?: string }) {
  const still = useClientValue(prefersReducedMotion, false);
  return (
    <div className="vq-poster" style={{ height }}>
      <RBTiltedCard
        imageSrc={src ?? EMPTY}
        altText={alt}
        captionText={caption ?? ""}
        containerHeight="100%"
        containerWidth="100%"
        imageHeight="100%"
        imageWidth="100%"
        scaleOnHover={still ? 1 : 1.04}
        rotateAmplitude={still ? 0 : 9}
        showMobileWarning={false}
        showTooltip={!!caption && !still}
        displayOverlayContent
        overlayContent={<Flash background="transparent">{children}</Flash>}
      />
    </div>
  );
}
