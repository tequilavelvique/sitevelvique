"use client";

import { useSyncExternalStore } from "react";

const never = () => () => {};

/**
 * A browser-only value read without a setState-in-effect: `server` during SSR and hydration (so markup
 * matches), `read()` after. `read` must return a stable value (a primitive, or cached).
 */
export function useClientValue<T>(read: () => T, server: T): T {
  return useSyncExternalStore(never, read, () => server);
}
