"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSite } from "@/components/providers/SiteProvider";
import { useNight } from "@/components/providers/NightProvider";
import { FlowingMenu, type FlowingItem } from "@/components/bits/FlowingMenu";
import { LangToggle } from "@/components/ui/primitives";
import { mediaUrl } from "@/lib/media";
import { WalletChip } from "./WalletChip";
import { Logo } from "@/components/chrome/Logo";

/** Full-screen menu: React Bits FlowingMenu; the marquee carries flash photos from the Grove archive. */
export function Menu() {
  const { t, menuOpen, setMenuOpen, manifest, media } = useSite();
  const { scrollTo } = useNight();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, setMenuOpen]);

  if (!menuOpen) return null;

  const close = () => setMenuOpen(false);
  const go = (href: string) => () => {
    close();
    if (href.startsWith("/#") && pathname === "/") requestAnimationFrame(() => scrollTo(href.slice(1)));
    else router.push(href);
  };

  // Archive photos first, then the shot-list slots, so the marquee always has evidence when any exists.
  const photos = [...manifest.archive.map((p) => mediaUrl(p.uri)), ...Object.values(media).map((m) => mediaUrl(m.uri))].filter(Boolean) as string[];
  const pic = (i: number) => photos[i % Math.max(photos.length, 1)] ?? null;

  const items: FlowingItem[] = [
    { key: "noche", label: t.nav.n1, href: "/#llegada" },
    { key: "after", label: t.nav.n3, href: "/el-after" },
    { key: "diario", label: t.nav.n9, href: "/diario" },
    { key: "eventos", label: t.nav.n10, href: "/eventos" },
    { key: "miembros", label: t.nav.n11, href: "/miembros" },
  ].map((it, i) => ({ ...it, image: pic(i), onSelect: go(it.href) }));

  const secondary = [
    { href: "/la-botella", label: t.nav.n2 },
    { href: "/acceso", label: t.nav.n4 },
    { href: "/mayoreo", label: t.nav.n6 },
    { href: "/verificar", label: t.nav.n7 },
    { href: "/ar", label: t.nav.n8 },
  ];

  return (
    <nav
      aria-label={t.nav.menu}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--ink)", padding: "calc(10px + env(safe-area-inset-top, 0px)) clamp(14px,4vw,56px) calc(28px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", overflowY: "auto" }}
      data-lenis-prevent
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
        <button type="button" onClick={close} className="eyebrow" style={{ justifySelf: "start", minHeight: 44, background: "none", border: 0, padding: "0 6px", cursor: "pointer", color: "var(--bone)" }}>
          {t.nav.close}
        </button>
        <Logo height="clamp(12px, 3.4vw, 22px)" />
        <span />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24, padding: "24px 0" }}>
        <FlowingMenu items={items} />
        <div className="cond" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 32px", borderTop: "1px solid var(--hairline)", paddingTop: 18, fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase" }}>
          {secondary.map((s) => (
            <Link key={s.href} href={s.href} onClick={close} className="hit">
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--hairline)", paddingTop: 8 }}>
        <WalletChip />
        <LangToggle />
      </div>
    </nav>
  );
}
