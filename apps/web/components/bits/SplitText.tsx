"use client";

import type { CSSProperties } from "react";
import RBSplitText from "@/components/reactbits/SplitText/SplitText";
import { EASE, prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

/** React Bits SplitText (GSAP SplitText plugin), tuned for timestamps: characters rise out of the dark. */
export function SplitText({
  text,
  as = "span",
  className = "",
  style,
  stagger = 22,
  splitType = "chars",
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  style?: CSSProperties;
  stagger?: number;
  splitType?: "chars" | "words" | "lines" | "words, chars";
}) {
  // Decided after hydration so server and client render the same markup.
  const still = useClientValue(prefersReducedMotion, false);
  const rest = { opacity: 1, yPercent: 0 };

  return (
    <span style={{ display: "inline-block", ...style }}>
      <RBSplitText
        text={text}
        tag={as}
        className={className}
        splitType={splitType}
        delay={stagger}
        duration={still ? 0 : 0.9}
        ease={EASE.develop}
        from={still ? rest : { opacity: 0, yPercent: 110 }}
        to={rest}
        threshold={0.12}
        rootMargin="-40px"
        textAlign="inherit"
      />
    </span>
  );
}
