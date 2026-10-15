"use client";

import RBScrollReveal from "@/components/reactbits/ScrollReveal/ScrollReveal";

/** React Bits ScrollReveal for ledes and manifestos: words surface as you scroll, scrubbed, no tilt. */
export function ScrollReveal({ text, className = "" }: { text: string; className?: string }) {
  return (
    <RBScrollReveal
      baseOpacity={0.08}
      baseRotation={0}
      blurStrength={6}
      enableBlur
      containerClassName={`vq-reveal ${className}`}
      textClassName="vq-reveal__text"
      rotationEnd="bottom bottom"
      wordAnimationEnd="center center"
    >
      {text}
    </RBScrollReveal>
  );
}
