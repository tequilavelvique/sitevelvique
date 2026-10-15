"use client";

import RBNoise from "@/components/reactbits/Noise/Noise";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

/**
 * React Bits Noise as the film grain over every route. Upstream draws a 1024 canvas; we slow the refresh
 * (every 5th frame) and freeze it for reduced motion, then screen-blend it at low alpha in a fixed layer.
 */
export function Noise() {
  const still = useClientValue(prefersReducedMotion, false);
  return (
    <div aria-hidden className="vq-grain">
      <RBNoise patternAlpha={20} patternRefreshInterval={still ? 1_000_000 : 5} />
    </div>
  );
}
