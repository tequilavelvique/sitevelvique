"use client";

import type { ReactNode } from "react";
import RBBorderGlow from "@/components/reactbits/BorderGlow/BorderGlow";

/**
 * React Bits BorderGlow as the house card: true black, square, a gold hairline at rest. As your hand nears an
 * edge, the label's blue (Pantone #4EA9D5) runs along it with a thread of gold. Never grey, never a fill.
 */
export function Edge({ children, className = "", quiet = false }: { children: ReactNode; className?: string; quiet?: boolean }) {
  return (
    <RBBorderGlow
      className={`vq-edge ${className}`}
      backgroundColor="#000000"
      borderRadius={0}
      glowColor="200 62 57"
      colors={["#4EA9D5", "#D4A84A", "#DDF0F9"]}
      glowRadius={quiet ? 22 : 34}
      glowIntensity={quiet ? 0.6 : 0.9}
      edgeSensitivity={28}
      coneSpread={22}
      fillOpacity={0}
    >
      {children}
    </RBBorderGlow>
  );
}
