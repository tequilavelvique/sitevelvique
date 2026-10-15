"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useNight } from "@/components/providers/NightProvider";

/**
 * A timestamp of the night. Entering it sets the header clock.
 *
 * Through the liquid: after the hero dive the page is the inside of the bottle, and each section surfaces out
 * of it. Everything is scrubbed to scroll (it sinks back if you scroll up), nothing plays on its own:
 *  - `[data-flash-photo]` rises from depth: small and far, under dark liquid (`--depth`, an ink veil drawn by
 *    CSS, so no filter runs per frame), drifting up into focus at full size.
 *  - headlines lift line by line out of masks, a beat behind the photos.
 * Transform and a veil only: LightsOut keeps sole ownership of opacity on `[data-dim]`.
 * `reveal={false}` for sections that run their own timeline (the pinned hero).
 */
export function NightSection({
  id,
  time,
  label,
  className,
  style,
  reveal = true,
  children,
}: {
  id?: string;
  time: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
  reveal?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { setClock } = useNight();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      ScrollTrigger.create({
        trigger: el,
        start: "top 65%",
        end: "bottom 35%",
        onToggle: (self) => {
          if (self.isActive) setClock(time);
        },
      });

      if (!reveal || prefersReducedMotion()) return;
      // Phones: tighter scrub so the motion stays under the thumb instead of trailing it.
      const scrub = window.matchMedia("(max-width: 767px)").matches ? 0.4 : 0.9;

      el.querySelectorAll<HTMLElement>("[data-flash-photo]").forEach((photo) => {
        photo.setAttribute("data-depth", "");
        gsap.fromTo(
          photo,
          { scale: 0.86, yPercent: 12, "--depth": 0.88 },
          {
            scale: 1,
            yPercent: 0,
            "--depth": 0,
            ease: "power2.out",
            // Measured on the untransformed parent, so the rise itself never shifts the trigger points.
            scrollTrigger: { trigger: photo.parentElement ?? photo, start: "top bottom", end: "top 38%", scrub },
          },
        );
      });

      // Display headlines only; React Bits ScrollReveal headings and RuleRow already run their own reveals.
      el.querySelectorAll<HTMLElement>("h2, .display").forEach((heading) => {
        if (heading.classList.contains("scroll-reveal")) return;
        SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              self.lines,
              { yPercent: 105 },
              {
                yPercent: 0,
                ease: "power3.out",
                stagger: 0.12,
                scrollTrigger: { trigger: heading, start: "top 96%", end: "top 62%", scrub },
              },
            ),
        });
      });
    },
    { scope: ref, dependencies: [time, reveal] },
  );

  return (
    <section ref={ref} id={id} data-time={time} data-screen-label={label} className={className} style={style}>
      {children}
    </section>
  );
}
