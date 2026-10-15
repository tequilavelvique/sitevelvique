import es from "./es.json";
import en from "./en.json";

export type Lang = "ES" | "EN";
export type Copy = typeof es;

// en must keep the exact shape of es; a missing key fails typecheck.
const enTyped: Copy = en;

export const COPY: Record<Lang, Copy> = { ES: es, EN: enTyped };

export type RegionKey = "MX" | "US" | "LA" | "EU" | "AS" | "AF" | "OC";

export type Region = {
  k: RegionKey;
  /** Legal drinking age; 0 means it varies by country, ask the generic question. */
  age: number;
  /** Bit index used by VelviqueCatalog.regionMask. */
  bit: number;
  ES: string;
  EN: string;
};

export const REGIONS: readonly Region[] = [
  { k: "MX", age: 18, bit: 0, ES: "México", EN: "Mexico" },
  { k: "US", age: 21, bit: 1, ES: "EE. UU.", EN: "USA" },
  { k: "LA", age: 18, bit: 2, ES: "Latinoamérica", EN: "Latin America" },
  { k: "EU", age: 18, bit: 3, ES: "Europa", EN: "Europe" },
  { k: "AS", age: 0, bit: 4, ES: "Asia", EN: "Asia" },
  { k: "AF", age: 18, bit: 5, ES: "África", EN: "Africa" },
  { k: "OC", age: 18, bit: 6, ES: "Oceanía", EN: "Oceania" },
] as const;

export const regionOf = (k: RegionKey): Region => REGIONS.find((r) => r.k === k) ?? REGIONS[0]!;

/** Brand tokens. Blue is reserved for the bottle and one active state per screen. */
export const TOKENS = {
  /** Pantone black (K95, #313030) renders as true black on screen: #313030 itself reads grey on a display. */
  ink: "#000000",
  inkRaised: "#000000",
  black: "#000000",
  /** Pantone K95 as printed, for print files only (labels, boxes), never on screen. */
  pantoneBlack: "#313030",
  bone: "#F4F9FC",
  boneSoft: "#DCECF5",
  body: "#C9E1EE",
  /** Labels and quiet text: tints of the Pantone blue. */
  muted: "#8CC6E6",
  faint: "#6FA6C6",
  paper: "#F4F9FC",
  paperInk: "#000000",
  /** Pantone HEX #4EA9D5 (C62 M18 Y0 K16): the label light. */
  led: "#4EA9D5",
  ledHover: "#74BCE0",
  ledCore: "#DDF0F9",
  ledBreathSeconds: 5,
  /** Gold for details only (rules, numerals, seal rings, frames). Always solid: partial alpha over black reads olive. */
  gold: "#D4A84A",
} as const;

/** Media slots. Defaults (alt, shot-list placeholder) live here; the image itself is set from /admin into the Grove manifest. */
export type MediaSlot =
  | "vq-hero-bottle"
  | "vq-flash-01"
  | "vq-after-1"
  | "vq-after-2"
  | "vq-after-3"
  | "vq-after-4"
  | "vq-led-table"
  | "vq-dawn"
  | "vq-unbox"
  | "vq-pour"
  | "vq-kosher"
  | "vq-story-amigos"
  | "vq-story-festival"
  | "vq-story-idea"
  | "vq-story-cap"
  | "vq-story-launch"
  | "vq-story-night"
  | "vq-story-toast";

/** `poster` marks a video slot (an mp4 on Grove plus its still); those are set in the repo, not from /admin. */
export type MediaEntry = { uri: string | null; poster?: string; alt: Record<Lang, string>; placeholder: Record<Lang, string> };

export { default as MEDIA } from "./media.json";

/**
 * Articles, events and the flash archive live on Grove (see @velvique/vault/cms). The one exception is this
 * starter set of journal articles: the site shows them while the Grove manifest has no articles, and /admin
 * publishes them to Grove in one go. Same shape as an ArticleDoc minus the bookkeeping fields.
 */
export type SeedArticle = {
  id: string;
  slug: string;
  kind: "cronica" | "historia" | "guia" | "nota" | "foto";
  author: string;
  title: Record<Lang, string>;
  excerpt: Record<Lang, string>;
  cover: string | null;
  tags: string[];
  access: "public";
  status: "published";
  publishedAt: string;
  body: Record<Lang, string>;
};

import diario from "./diario.json";
export const DIARIO_SEED = diario as SeedArticle[];
