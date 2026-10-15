"use client";

import type { CSSProperties, ReactNode } from "react";
import RBGlareHover from "@/components/reactbits/GlareHover/GlareHover";

/**
 * React Bits GlareHover as the camera flash: one hard white pass across a photo when you reach for it.
 * Plays once per hover (a flash, not a shimmer). The glare is lifted above the photo in reactbits-theme.css.
 */
export function Flash({ children, className = "", style, background = "var(--ink-raised)" }: { children?: ReactNode; className?: string; style?: CSSProperties; background?: string }) {
  return (
    <RBGlareHover
      className={`vq-flash ${className}`}
      style={style}
      width="100%"
      height="100%"
      background={background}
      borderRadius="0"
      borderColor="transparent"
      glareColor="#ffffff"
      glareOpacity={0.34}
      glareAngle={-32}
      glareSize={280}
      transitionDuration={850}
      playOnce
    >
      {children}
    </RBGlareHover>
  );
}
