"use client";

import RBShinyText from "@/components/reactbits/ShinyText/ShinyText";
import { TOKENS } from "@velvique/content";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

/** React Bits ShinyText for waiting states (minting, opening, loading): the light passing over the words while the chain works. */
export function Shiny({ text, className = "" }: { text: string; className?: string }) {
  const still = useClientValue(prefersReducedMotion, false);
  return <RBShinyText text={text} className={`vq-shiny ${className}`} color={TOKENS.muted} shineColor={TOKENS.bone} speed={2.6} spread={110} disabled={still} />;
}
