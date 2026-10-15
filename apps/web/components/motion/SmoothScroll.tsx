"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { useNight } from "@/components/providers/NightProvider";
import { useSite } from "@/components/providers/SiteProvider";

/** Lenis smooth scroll driven by the GSAP ticker so ScrollTrigger scrubs stay in sync. */
export function SmoothScroll() {
  const { lenis, bindLenis } = useNight();
  const { gateOpen, menuOpen } = useSite();
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const l = new Lenis({ autoRaf: false, lerp: 0.085, wheelMultiplier: 0.9 });
    bindLenis(l);
    l.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => l.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      bindLenis(null);
    };
  }, [bindLenis]);

  // Gate and full-screen menu freeze the night behind them.
  useEffect(() => {
    const locked = gateOpen || menuOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
  }, [gateOpen, menuOpen, lenis]);

  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname, lenis]);

  return null;
}
