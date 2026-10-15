"use client";

import { createContext, useCallback, useContext, useEffect, useInsertionEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useSite } from "./SiteProvider";

/**
 * The night's clock and the flash. Every section is a timestamp; entering a new one fires a one-frame
 * camera flash (GSAP owns the timing, scroll owns the trigger). First section of a route never flashes.
 */
type NightState = {
  clock: string;
  setClock: (c: string) => void;
  flash: () => void;
  /** Returns true if this timestamp was new on this route (and so should flash). */
  markSeen: (time: string) => boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  lenis: RefObject<Lenis | null>;
  /** SmoothScroll registers (and clears) the one Lenis instance here. */
  bindLenis: (l: Lenis | null) => void;
  scrollTo: (target: string | HTMLElement | number) => void;
};

const Ctx = createContext<NightState | null>(null);

export function NightProvider({ children, flashCut = true }: { children: ReactNode; flashCut?: boolean }) {
  const { gateOpen } = useSite();
  const [clock, setClock] = useState("11:48 PM");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const lenis = useRef<Lenis | null>(null);
  const seen = useRef(new Set<string>());
  const gateRef = useRef(gateOpen);
  // Insertion effects run before every layout/passive effect, so children calling flash() see the current gate.
  useInsertionEffect(() => {
    gateRef.current = gateOpen;
  }, [gateOpen]);
  const pathname = usePathname();

  useEffect(() => {
    seen.current.clear();
  }, [pathname]);

  const flash = useCallback(() => {
    const el = overlayRef.current;
    if (!el || !flashCut || gateRef.current || prefersReducedMotion()) return;
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 0.85 });
    gsap.to(el, { opacity: 0, duration: 0.42, delay: 0.045, ease: "power2.out" });
  }, [flashCut]);

  const markSeen = useCallback((time: string) => {
    if (seen.current.has(time)) return false;
    const first = seen.current.size === 0;
    seen.current.add(time);
    return !first;
  }, []);

  const scrollTo = useCallback((target: string | HTMLElement | number) => {
    const offset = -40;
    if (lenis.current) {
      lenis.current.scrollTo(target as never, { offset });
      return;
    }
    const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : typeof target === "number" ? null : target;
    const top = typeof target === "number" ? target : el ? el.getBoundingClientRect().top + window.scrollY + offset : 0;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const bindLenis = useCallback((l: Lenis | null) => {
    lenis.current = l;
  }, []);

  const value = useMemo(() => ({ clock, setClock, flash, markSeen, overlayRef, lenis, bindLenis, scrollTo }), [clock, flash, markSeen, bindLenis, scrollTo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNight(): NightState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNight outside NightProvider");
  return v;
}

/** Non-narrative routes set a fixed label in the header clock slot. */
export function useClockLabel(label: string) {
  const { setClock } = useNight();
  useEffect(() => setClock(label), [label, setClock]);
}
