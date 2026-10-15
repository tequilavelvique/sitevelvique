import { z } from "zod";

/**
 * Grove CMS. No database: the site is described by ONE mutable JSON on Grove (the site manifest),
 * owned by the admin wallet (wallet-only ACL). Its lens:// URI never changes across edits, so the web app
 * reads a single pointer (NEXT_PUBLIC_GROVE_SITE_URI). Articles and events each live in their own JSON doc;
 * the manifest lists them. Grove is world-readable, so members-only bodies are sealed envelopes that only
 * the server's members key can open.
 *
 * This module is pure: schemas and manifest transforms. Upload/edit/delete live in grove.ts.
 */

const hex = z.string().regex(/^0x[0-9a-fA-F]*$/);
const lensOrUrl = z.string().min(1);

export const Localized = z.object({ ES: z.string(), EN: z.string() });
export type Localized = z.infer<typeof Localized>;

export const Access = z.enum(["public", "members"]);
export type Access = z.infer<typeof Access>;

export const Status = z.enum(["draft", "published"]);

export const EnvelopeSchema = z.object({
  v: z.literal(1),
  alg: z.string(),
  recipient: hex,
  ct: z.string(),
  sha256: hex,
});

// ------------------------------------------------------------------ articles

/** What kind of post: a night's chronicle, a brand story, a how-to, a short note, or a photo essay. */
export const ArticleKind = z.enum(["cronica", "historia", "guia", "nota", "foto"]);
export type ArticleKind = z.infer<typeof ArticleKind>;

export const ArticleEntry = z.object({
  id: z.string(),
  slug: z.string(),
  uri: lensOrUrl,
  title: Localized,
  excerpt: Localized,
  cover: lensOrUrl.nullable(),
  tags: z.array(z.string()).default([]),
  access: Access,
  status: Status,
  publishedAt: z.string(),
  /** Optional so manifests written before these fields still parse. */
  kind: ArticleKind.optional(),
  author: z.string().optional(),
  /** Reading time, stored on the entry so the index can show it without fetching every body. */
  minutes: z.number().int().positive().optional(),
});
export type ArticleEntry = z.infer<typeof ArticleEntry>;

export const ArticleDoc = ArticleEntry.omit({ uri: true }).extend({
  v: z.literal(1),
  /** Public: markdown per locale. Members: envelope sealing `{ ES, EN }` markdown. */
  body: z.union([Localized, EnvelopeSchema]),
  updatedAt: z.string(),
});
export type ArticleDoc = z.infer<typeof ArticleDoc>;

// ------------------------------------------------------------------ events

export const EventEntry = z.object({
  id: z.string(),
  slug: z.string(),
  uri: lensOrUrl,
  title: Localized,
  summary: Localized,
  /** ISO 8601 with offset, e.g. 2026-11-14T22:00:00-06:00 */
  startsAt: z.string(),
  city: z.string(),
  /** Public venue label. For members events this can stay vague ("Por confirmar"). */
  venue: z.string(),
  cover: lensOrUrl.nullable(),
  access: Access,
  status: Status,
});
export type EventEntry = z.infer<typeof EventEntry>;

/** Sealed for members events: exact address, door time, dress code, RSVP instructions. */
export const EventPrivate = z.object({ ES: z.string(), EN: z.string(), address: z.string().optional() });
export type EventPrivate = z.infer<typeof EventPrivate>;

export const EventDoc = EventEntry.omit({ uri: true }).extend({
  v: z.literal(1),
  body: Localized,
  private: EnvelopeSchema.nullable(),
  updatedAt: z.string(),
});
export type EventDoc = z.infer<typeof EventDoc>;

// ------------------------------------------------------------------ archive (el after)

export const ArchivePhoto = z.object({
  id: z.string(),
  uri: lensOrUrl,
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  time: z.string().optional(),
  meme: z.tuple([z.string(), z.string()]).optional(),
});
export type ArchivePhoto = z.infer<typeof ArchivePhoto>;

// ------------------------------------------------------------------ manifest

export const SiteManifest = z.object({
  v: z.literal(1),
  updatedAt: z.string(),
  /** Media slot id (content/media.json) -> lens:// image. */
  media: z.record(z.string(), lensOrUrl).default({}),
  /** Optional copy overrides per locale (lens:// JSON with the shape of content/es.json). */
  copy: z.object({ ES: lensOrUrl.nullable(), EN: lensOrUrl.nullable() }).default({ ES: null, EN: null }),
  articles: z.array(ArticleEntry).default([]),
  events: z.array(EventEntry).default([]),
  archive: z.array(ArchivePhoto).default([]),
});
export type SiteManifest = z.infer<typeof SiteManifest>;

export const emptyManifest = (): SiteManifest => ({
  v: 1,
  updatedAt: new Date().toISOString(),
  media: {},
  copy: { ES: null, EN: null },
  articles: [],
  events: [],
  archive: [],
});

export function parseManifest(x: unknown): SiteManifest | null {
  const r = SiteManifest.safeParse(x);
  return r.success ? r.data : null;
}

const stamp = (m: SiteManifest): SiteManifest => ({ ...m, updatedAt: new Date().toISOString() });
const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

export const upsertArticle = (m: SiteManifest, a: ArticleEntry) =>
  stamp({ ...m, articles: upsert(m.articles, a).sort((x, y) => y.publishedAt.localeCompare(x.publishedAt)) });
export const removeArticle = (m: SiteManifest, id: string) => stamp({ ...m, articles: m.articles.filter((a) => a.id !== id) });

export const upsertEvent = (m: SiteManifest, e: EventEntry) =>
  stamp({ ...m, events: upsert(m.events, e).sort((x, y) => x.startsAt.localeCompare(y.startsAt)) });
export const removeEvent = (m: SiteManifest, id: string) => stamp({ ...m, events: m.events.filter((e) => e.id !== id) });

export const addArchive = (m: SiteManifest, p: ArchivePhoto) => stamp({ ...m, archive: [p, ...m.archive] });
export const updateArchive = (m: SiteManifest, p: ArchivePhoto) => stamp({ ...m, archive: m.archive.map((x) => (x.id === p.id ? p : x)) });
export const removeArchive = (m: SiteManifest, id: string) => stamp({ ...m, archive: m.archive.filter((p) => p.id !== id) });

export const setMedia = (m: SiteManifest, slot: string, uri: string | null) => {
  const media = { ...m.media };
  if (uri) media[slot] = uri;
  else delete media[slot];
  return stamp({ ...m, media });
};

export const setCopy = (m: SiteManifest, lang: "ES" | "EN", uri: string | null) => stamp({ ...m, copy: { ...m.copy, [lang]: uri } });

// ------------------------------------------------------------------ queries

export const published = <T extends { status: "draft" | "published" }>(list: T[]) => list.filter((x) => x.status === "published");

export function splitEvents(events: EventEntry[], now = new Date()) {
  const live = published(events);
  const t = now.getTime();
  // An event stays "upcoming" until 8 hours after it starts: the night is still going.
  const upcoming = live.filter((e) => new Date(e.startsAt).getTime() + 8 * 3600_000 >= t);
  const past = live.filter((e) => new Date(e.startsAt).getTime() + 8 * 3600_000 < t).reverse();
  return { upcoming, past };
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Minutes to read a markdown body at ~220 words a minute. */
export const readingMinutes = (s: string) => Math.max(1, Math.round(s.split(/\s+/).length / 220));

export const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
