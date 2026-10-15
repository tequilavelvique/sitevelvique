/** SDK-free helpers, safe to import from any client or server component. */
export const GROVE_GATEWAY = "https://api.grove.storage";

/** lens://<key> -> https gateway URL. */
export function resolveLens(uri: string): string {
  if (uri.startsWith("lens://")) return `${GROVE_GATEWAY}/${uri.slice("lens://".length)}`;
  return uri;
}

export async function fetchJson<T>(uri: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T> {
  const res = await fetch(resolveLens(uri), init);
  if (!res.ok) throw new Error(`Grove ${res.status} for ${uri}`);
  return (await res.json()) as T;
}
