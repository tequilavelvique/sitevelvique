"use client";

import Link from "next/link";
import { useSite } from "@/components/providers/SiteProvider";
import { LangToggle } from "@/components/ui/primitives";
import { Logo } from "@/components/chrome/Logo";

export function Footer() {
  const { t } = useSite();
  const links = [
    { href: "/la-botella", label: t.footer.f1 },
    { href: "/el-after", label: t.footer.f2 },
    { href: "/diario", label: t.nav.n9 },
    { href: "/eventos", label: t.nav.n10 },
    { href: "/miembros", label: t.nav.n11 },
    { href: "/verificar", label: t.footer.f3 },
    { href: "/mayoreo", label: t.footer.f4 },
    { href: "/ar", label: t.footer.f5 },
  ];

  return (
    <footer id="pie" className="gutter hairline-top" style={{ paddingTop: 72, paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
      <div className="stack" style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <Logo width="min(80vw, 1100px)" />
        <span className="gold-rule center" aria-hidden />
        <span className="caption-i center">{t.footer.tag}</span>
        <span className="eyebrow center">{t.footer.creds}</span>
      </div>
      <nav className="cond" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 36px", fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hit">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="cond hairline-top" style={{ width: "100%", maxWidth: 1280, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 16, fontSize: 12, letterSpacing: ".16em", color: "var(--muted)" }}>
        <span>{t.footer.legal}</span>
        <LangToggle />
      </div>
    </footer>
  );
}
