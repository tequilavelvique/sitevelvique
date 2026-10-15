"use client";

import type { ReactNode } from "react";
import RBMagnet from "@/components/reactbits/Magnet/Magnet";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

const off = () => prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches;

/**
 * React Bits Magnet for the one action a screen leads to: it leans toward your hand a few pixels before you
 * reach it. Mouse only; off for touch and reduced motion. Use once per screen, on the blue action.
 */
export function Pull({ children, block = false }: { children: ReactNode; block?: boolean }) {
  const disabled = useClientValue(off, true);
  return (
    <RBMagnet wrapperClassName={block ? "vq-pull--block" : ""} padding={40} magnetStrength={14} disabled={disabled} activeTransition="transform 0.35s cubic-bezier(0.22,0.6,0.36,1)" inactiveTransition="transform 0.7s cubic-bezier(0.22,0.6,0.36,1)">
      {children}
    </RBMagnet>
  );
}
