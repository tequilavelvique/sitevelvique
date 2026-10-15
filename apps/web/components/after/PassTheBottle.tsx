"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export type PassTarget = { moveTo: (frame: HTMLElement) => void };

/**
 * "Pass the bottle": a small lit bottle travels between photo frames, following the cursor
 * (or a tap on touch). It is the only blue element on the page.
 */
export const PassTheBottle = forwardRef<PassTarget>(function PassTheBottle(_, ref) {
  const el = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    moveTo(frame) {
      const b = el.current;
      const parent = b?.offsetParent as HTMLElement | null;
      if (!b || !parent) return;
      const f = frame.getBoundingClientRect();
      const p = parent.getBoundingClientRect();
      const x = f.right - p.left - 34;
      const y = f.bottom - p.top - 92;
      if (prefersReducedMotion()) {
        gsap.set(b, { x, y, opacity: 1 });
        return;
      }
      gsap.to(b, { x, y, opacity: 1, rotation: gsap.utils.random(-14, 14), duration: 0.9, ease: "power3.inOut", overwrite: true });
    },
  }));

  return (
    <div ref={el} aria-hidden data-led style={{ position: "absolute", left: 0, top: 0, zIndex: 3, pointerEvents: "none", opacity: 0, willChange: "transform" }}>
      <svg width="28" height="84" viewBox="0 0 28 84">
        <defs>
          <radialGradient id="ptb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4EA9D5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#4EA9D5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="14" cy="50" rx="26" ry="30" fill="url(#ptb-glow)" />
        <path d="M10 0h8v12l2 4 3 6v60H5V22l3-6 2-4z" fill="#000" stroke="#4EA9D566" strokeWidth="0.75" />
        <rect x="9" y="38" width="10" height="26" fill="#060608" />
        <path d="M11 44l3 9 3-9" fill="none" stroke="#DDF0F9" strokeWidth="1.1" />
        <rect x="11" y="57" width="6" height="0.8" fill="#DDF0F9" />
      </svg>
    </div>
  );
});
