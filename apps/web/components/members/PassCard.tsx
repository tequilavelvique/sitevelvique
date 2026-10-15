"use client";

import { useRef, type PointerEvent } from "react";
import { Logo } from "@/components/chrome/Logo";
import { prefersReducedMotion } from "@/lib/gsap";

/**
 * The membership pass as an object you want to hold: black card ribbed like the bottle's facets, a hairline gold
 * frame, the logo lit in the label's blue (the one blue on the screen), a slow sheen, a few degrees of tilt. Tilt writes CSS
 * variables straight to the element (no React re-render per move) and stays off for touch and reduced motion.
 */
export function PassCard({ top, bottomLeft, bottomRight, preview = false }: { top: [string, string]; bottomLeft: string; bottomRight: string; preview?: boolean }) {
  const card = useRef<HTMLDivElement>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = card.current;
    if (!el || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = card.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--gx", "50%");
  };

  return (
    <div className="pass-stage" onPointerMove={move} onPointerLeave={leave}>
      <div ref={card} className={preview ? "pass pass--preview" : "pass"} role="img" aria-label={`${top[0]} · ${top[1]}`}>
        <div className="eyebrow pass__row">
          <span>{top[0]}</span>
          <span className="gold-num">{top[1]}</span>
        </div>
        <div className="pass__logo">
          <Logo width="72%" style={{ display: "block" }} />
        </div>
        <div className="cond pass__row pass__foot">
          <span>{bottomLeft}</span>
          <span>{bottomRight}</span>
        </div>
      </div>
    </div>
  );
}
