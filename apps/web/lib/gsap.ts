"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";

/**
 * One registration point for the whole GSAP set (all plugins ship in the public `gsap` package since 3.13).
 *  - ScrollTrigger: per-route master timelines, pins, scrubs (synced to Lenis in SmoothScroll)
 *  - SplitText:     timestamp and headline reveals (also used by React Bits SplitText)
 *  - Flip:          archive lightbox, journal filtering
 *  - DrawSVG:       hairline rules drawing in
 *  - CustomEase:    brand eases below
 *  - Observer:      pointer/scroll intent for the hero
 */
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip, DrawSVGPlugin, Observer, useGSAP);

// Phones: the address bar showing/hiding is a resize; refreshing on it makes pinned sections jump mid-scroll.
if (typeof window !== "undefined") ScrollTrigger.config({ ignoreMobileResize: true });

/** Brand motion vocabulary. A flash is instant on, slow off; the night drifts; the LED breathes. */
export const EASE = {
  flash: CustomEase.create("vq-flash", "M0,0 C0.05,0.9 0.18,1 1,1"),
  drift: CustomEase.create("vq-drift", "M0,0 C0.45,0 0.2,1 1,1"),
  breath: CustomEase.create("vq-breath", "M0,0 C0.37,0 0.63,1 1,1"),
  develop: CustomEase.create("vq-develop", "M0,0 C0.22,0.6 0.36,1 1,1"),
} as const;

gsap.defaults({ ease: EASE.drift, duration: 0.9 });

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText, Flip, DrawSVGPlugin, Observer, useGSAP };
