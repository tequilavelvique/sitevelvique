"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * Lights out: scrolling into the section dims every `[data-dim]` element so the LED reads as the brightest thing,
 * then the scene comes back up. Text has to stay readable the whole time, so the floor is high (0.85 by default):
 * the room dims, the words never do. Elements marked `[data-led]` are never dimmed.
 */
export function LightsOut({ children, depth = 0.85 }: { children: ReactNode; depth?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const targets = ref.current?.querySelectorAll<HTMLElement>("[data-dim]");
      if (!targets?.length) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ref.current, start: "top 75%", end: "bottom 25%", scrub: 0.6 },
      });
      tl.fromTo(targets, { opacity: 1 }, { opacity: depth, ease: "none", duration: 1 })
        .to({}, { duration: 0.6 })
        .to(targets, { opacity: 1, ease: "none", duration: 1 });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {children}
    </div>
  );
}
