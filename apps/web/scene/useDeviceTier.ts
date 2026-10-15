"use client";

import { useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import type { DeviceTier } from "./bottle";

/**
 * Three device tiers (guide section 7):
 *  1 full bloom + transmission · 2 no transmission, lighter bloom · 3 looping video / still fallback.
 * Starts from a hardware guess; PerformanceMonitor can demote at runtime.
 */
export function detectTier(): DeviceTier {
  if (typeof window === "undefined") return 2;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return 3;
  if (!hasWebGL2()) return 3;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent);
  if (cores <= 2 || mem <= 2) return 3;
  if (mobile || cores <= 4 || mem <= 4) return 2;
  return 1;
}

let webgl: boolean | undefined;
/** Whether a WebGL2 context can be created at all; probed once (each probe allocates a context). */
export function hasWebGL2(): boolean {
  if (typeof window === "undefined") return false;
  return (webgl ??= Boolean(document.createElement("canvas").getContext("webgl2")));
}

// Probed once per page: the probe creates a WebGL context, and useSyncExternalStore reads on every render.
let probed: DeviceTier | undefined;
const probeOnce = () => (probed ??= detectTier());

/** `null` until hydrated; the setter lets PerformanceMonitor demote at runtime. */
export function useDeviceTier(): [DeviceTier | null, (t: DeviceTier) => void] {
  const detected = useClientValue<DeviceTier | null>(probeOnce, null);
  const [demoted, setTier] = useState<DeviceTier | null>(null);
  return [demoted ?? detected, setTier];
}
