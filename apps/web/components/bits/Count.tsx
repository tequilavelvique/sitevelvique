"use client";

import RBCountUp from "@/components/reactbits/CountUp/CountUp";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

/** React Bits CountUp for numbers that are counted, not decorative: bottles left, counting down to what remains. */
export function Count({ to, from, className = "" }: { to: number; from?: number; className?: string }) {
  const still = useClientValue(prefersReducedMotion, false);
  if (still) return <span className={className}>{to}</span>;
  return <RBCountUp to={to} from={from ?? Math.round(to * 1.6) + 4} direction="up" duration={1.4} className={className} />;
}
