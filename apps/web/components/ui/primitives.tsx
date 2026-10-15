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

export function LangToggle({ size = 14 }: { size?: number }) {
  const { lang, setLang } = useSite();
  return (
    <span style={{ display: "flex", gap: 2 }}>
      {(["ES", "EN"] as const).map((l) => (
        <button
          key={l}
          type="button"
          className="lang-btn"
          aria-label={l === "ES" ? "Español" : "English"}
          title={l === "ES" ? "Español" : "English"}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
        >
          <Flag lang={l} height={size} />
        </button>
      ))}
    </span>
  );
}

/** ES is Mexico, where the bottle is from; EN is the US. Drawn SVG, never emoji. */
function Flag({ lang, height }: { lang: "ES" | "EN"; height: number }) {
  return (
    <svg className="lang-flag" viewBox="0 0 21 14" width={(height * 3) / 2} height={height} aria-hidden>
      {lang === "ES" ? (
        <>
          <rect width="7" height="14" fill="#006847" />
          <rect x="7" width="7" height="14" fill="#FFFFFF" />
          <rect x="14" width="7" height="14" fill="#CE1126" />
          <circle cx="10.5" cy="7" r="1.9" fill="#8C5A2B" />
          <path d="M8.9 8.1q1.6 1.5 3.2 0" stroke="#006847" strokeWidth=".6" fill="none" />
        </>
      ) : (
        <>
          <rect width="21" height="14" fill="#FFFFFF" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={(i * 14) / 13} width="21" height={14 / 13} fill="#B22234" />
          ))}
          <rect width="8.6" height={(7 * 14) / 13} fill="#3C3B6E" />
          {[1.4, 3.6, 5.8, 7.6].flatMap((x, c) =>
            [1.4, 3.6, 5.8].map((y) => <circle key={`${c}${y}`} cx={x - (y === 3.6 ? 1.1 : 0)} cy={y} r=".45" fill="#FFFFFF" />),
          )}
        </>
      )}
    </svg>
  );
}
