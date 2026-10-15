"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { REGIONS, regionOf, type Copy, type Lang, type RegionKey } from "@velvique/content";
import type { SiteContent } from "@/lib/content";

/**
 * Session state held in memory only: language, region, age-gate answer, menu.
 * A reload asks again. Nothing is written to storage or cookies (guide section 4, hard rules).
 */
type SiteState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Copy;
  media: SiteContent["media"];
  /** Grove site manifest: articles, events, archive, media overrides. */
  manifest: SiteContent["manifest"];
  region: RegionKey;
  regionBit: number;
  setRegion: (r: RegionKey) => void;
  gateOpen: boolean;
  denied: boolean;
  enter: () => void;
  deny: () => void;
  menuOpen: boolean;
  setMenuOpen: (o: boolean) => void;
};

const Ctx = createContext<SiteState | null>(null);

export function SiteProvider({ content, children }: { content: SiteContent; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ES");
  const [region, setRegion] = useState<RegionKey>(REGIONS[0]!.k);
  const [gateOpen, setGateOpen] = useState(true);
  const [denied, setDenied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang === "ES" ? "es" : "en";
  }, [lang]);

  const enter = useCallback(() => setGateOpen(false), []);
  const deny = useCallback(() => setDenied(true), []);

  const value = useMemo<SiteState>(
    () => ({
      lang,
      setLang,
      t: content.copy[lang],
      media: content.media,
      manifest: content.manifest,
      region,
      regionBit: regionOf(region).bit,
      setRegion,
      gateOpen,
      denied,
      enter,
      deny,
      menuOpen,
      setMenuOpen,
    }),
    [lang, content, region, gateOpen, denied, enter, deny, menuOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite(): SiteState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSite outside SiteProvider");
  return v;
}

export const useT = () => useSite().t;

/** `{n}` / `{id}` interpolation for copy strings. */
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
