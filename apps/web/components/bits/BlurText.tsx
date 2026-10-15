"use client";

import type { CSSProperties } from "react";
import RBBlurText from "@/components/reactbits/BlurText/BlurText";

/** React Bits BlurText (motion): words come into focus like eyes adjusting to the dark. */
export function BlurText({ text, className = "", style }: { text: string; className?: string; style?: CSSProperties }) {
  return (
    <div style={style} className="vq-blurtext">
      <RBBlurText
        text={text}
        className={className}
        animateBy="words"
        direction="bottom"
        delay={45}
        stepDuration={0.45}
        threshold={0.2}
        animationFrom={{ filter: "blur(10px)", opacity: 0, y: 8 }}
        animationTo={[
          { filter: "blur(4px)", opacity: 0.6, y: 2 },
          { filter: "blur(0px)", opacity: 1, y: 0 },
        ]}
      />
    </div>
  );
}
