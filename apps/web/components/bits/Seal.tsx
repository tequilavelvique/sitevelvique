"use client";

import type { CSSProperties, ReactNode } from "react";
import RBCircularText from "@/components/reactbits/CircularText/CircularText";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

/**
 * React Bits CircularText as an ink stamp: the words a door stamps on your hand, or a certifier prints on a
 * label, turning slowly around a mark. Slows when you look at it. Still for reduced motion.
 */
export function Seal({
  text,
  children,
  size = 132,
  tone = "bone",
  className = "",
  style,
}: {
  text: string;
  children?: ReactNode;
  size?: number;
  tone?: "bone" | "ink";
  className?: string;
  style?: CSSProperties;
}) {
  const still = useClientValue(prefersReducedMotion, false);
  // Even letter spacing around the ring needs a trailing separator so the seam does not show.
  const ring = `${text.trim().toUpperCase()} · `;
  return (
    <div className={`vq-seal vq-seal--${tone} ${className}`} style={{ width: size, height: size, ["--seal-fs" as string]: `${Math.max(9, size / 13)}px`, ...style }} aria-label={text} role="img">
      <div aria-hidden className="vq-seal__ring">
        <RBCircularText text={ring} spinDuration={still ? 1e7 : 36} onHover="slowDown" />
      </div>
      {children ? (
        <div aria-hidden className="vq-seal__mark">
          {children}
        </div>
      ) : null}
    </div>
  );
}
