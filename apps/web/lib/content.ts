import "server-only";
import { COPY, DIARIO_SEED, MEDIA, type Copy, type Lang, type MediaEntry, type MediaSlot } from "@velvique/content";
import { fetchJson } from "@velvique/vault/lens";
import { emptyManifest, parseManifest, readingMinutes, type ArticleEntry, type SiteManifest } from "@velvique/vault/cms";
import { env } from "@/lib/env";

/**
 * Everything editable lives in the Grove site manifest (articles, events, archive, media, copy overrides).
 * The repo `content/` is the seed and the fallback; a Grove failure never breaks the page.
 * Admin saves call /api/revalidate, so changes show up on the next request instead of waiting for REVALIDATE.
 */
export const REVALIDATE = 60;
export const GROVE_TAG = "grove";

const cached = { next: { revalidate: REVALIDATE, tags: [GROVE_TAG] } };

async function fromGrove<T>(uri: string | null | undefined, fallback: T, guard?: (x: unknown) => T | null): Promise<T> {
  if (!uri) return fallback;
  try {
    const raw = await fetchJson<unknown>(uri, cached);
    return guard ? (guard(raw) ?? fallback) : (raw as T);
  } catch {
    return fallback;
  }
}

/** Starter articles from the repo carry this URI prefix instead of a Grove one; their body is bundled. */
const SEED_URI = "seed:";

const seedEntries = (): ArticleEntry[] =>
  DIARIO_SEED.map(({ body, ...a }) => ({ ...a, uri: `${SEED_URI}${a.slug}`, minutes: readingMinutes(body.ES) }));

export const isSeed = (uri: string) => uri.startsWith(SEED_URI);
export const seedBody = (slug: string) => DIARIO_SEED.find((a) => a.slug === slug)?.body ?? null;

/** Until the first article is published to Grove, the journal shows the repo's starter set. */
export async function loadManifest(): Promise<SiteManifest> {
  const m = await fromGrove(env.groveSiteUri, emptyManifest(), parseManifest);
  return m.articles.length ? m : { ...m, articles: seedEntries() };
}

export type SiteContent = {
  copy: Record<Lang, Copy>;
  media: Record<MediaSlot, MediaEntry>;
  manifest: SiteManifest;
};

export async function loadContent(): Promise<SiteContent> {
  const manifest = await loadManifest();
  const [es, en] = await Promise.all([fromGrove(manifest.copy.ES, COPY.ES), fromGrove(manifest.copy.EN, COPY.EN)]);

  // Manifest media overrides the repo defaults slot by slot; alt and placeholder copy stay from the repo.
  const base = MEDIA as Record<MediaSlot, MediaEntry>;
  const media = Object.fromEntries(
    Object.entries(base).map(([slot, entry]) => [slot, { ...entry, uri: manifest.media[slot] ?? entry.uri }]),
  ) as Record<MediaSlot, MediaEntry>;

  return { copy: { ES: { ...COPY.ES, ...es }, EN: { ...COPY.EN, ...en } }, media, manifest };
}
