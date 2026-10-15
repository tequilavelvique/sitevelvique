"use client";

import type { CSSProperties, ReactNode } from "react";
import RBSpotlightCard from "@/components/reactbits/SpotlightCard/SpotlightCard";

/**
 * React Bits SpotlightCard as the house surface: a lacquer slab that stays dark until your light finds it.
 * Beam shape (a cone from the ceiling, like a booth light at the door), the label's blue, film grain inside
 * the light. The beam is the label's light on the room, not a control. Keyboard focus inside the slab moves the beam onto it.
 */
export function Slab({
  children,
  className = "",
  style,
  size = 360,
  quiet = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Beam width in px; wide rows want a wider cone. */
  size?: number;
  /** Lower light for slabs that sit next to the screen's one blue action. */
  quiet?: boolean;
}) {
  return (
    <RBSpotlightCard
      className={`vq-slab ${className}`}
      style={style}
      shape="beam"
      spotlightColor="#4EA9D5"
      intensity={quiet ? 0.05 : 0.08}
      spotlightSize={size}
      softness={0.85}
      borderGlow={quiet ? 0.35 : 0.6}
      proximity={140}
      smoothing={0.35}
      grain={0}
      flare
      theme="dark"
    >
      {children}
    </RBSpotlightCard>
  );
}
