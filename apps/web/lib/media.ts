import { resolveLens } from "@velvique/vault/lens";

/** lens:// or https -> fetchable URL; null stays null so the slot renders its placeholder. */
export const mediaUrl = (uri: string | null | undefined): string | null => (uri ? resolveLens(uri) : null);

export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function clockLabel(d = new Date()): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
