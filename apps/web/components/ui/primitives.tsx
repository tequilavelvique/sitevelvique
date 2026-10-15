"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { EASE, gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useSite } from "@/components/providers/SiteProvider";

/** The LED's spill as CSS: a breathing candle-blue radial behind the bottle. */
export function Glow({ size, opacity = 1, style }: { size: string; opacity?: number; style?: CSSProperties }) {
  return <div className="glow" aria-hidden data-led style={{ width: size, height: size, opacity, ...style }} />;
}

/** Section header: roman numeral, hairline, timestamp. The hairline draws itself in (GSAP DrawSVG). */
export function RuleRow({ left, right, style }: { left: ReactNode; right: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const line = ref.current?.querySelector("line");
      if (!line || prefersReducedMotion()) return;
      gsap.fromTo(line, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 1.4, ease: EASE.develop, scrollTrigger: { trigger: ref.current, start: "top 92%", once: true } });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="rule-row eyebrow" style={style}>
      <span>{left}</span>
      <svg className="line line--svg" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="1" x2="100" y2="1" stroke="#4EA9D552" strokeWidth="1" />
      </svg>
      <span>{right}</span>
    </div>
  );
}

/** Two-beat caption meme: setup / punchline, black boxes over a flash photo. */
export function Meme({ lines, style }: { lines: readonly string[]; style?: CSSProperties }) {
  return (
    <div className="meme" style={{ position: "absolute", left: 16, top: 16, ...style }}>
      {lines.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

export function LangToggle({ size = 11 }: { size?: number }) {
  const { lang, setLang } = useSite();
  return (
    <span style={{ display: "flex", gap: 2 }}>
      {(["ES", "EN"] as const).map((l) => (
        <button key={l} type="button" className="lang-btn" style={{ fontSize: size }} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l}
        </button>
      ))}
    </span>
  );
}
