"use client";

import { useNight } from "@/components/providers/NightProvider";

/** One full-screen white frame, driven by NightProvider.flash(). Sits above content, below the age gate. */
export function FlashOverlay() {
  const { overlayRef } = useNight();
  return (
    <div
      ref={overlayRef}
      aria-hidden
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 70, background: "#FFFFFF", opacity: 0 }}
    />
  );
}
