"use client";

import Link from "next/link";
import { useSite } from "@/components/providers/SiteProvider";
import { useNight } from "@/components/providers/NightProvider";
import { LangToggle } from "@/components/ui/primitives";
import { Logo } from "@/components/chrome/Logo";

export function Header() {
  const { t, setMenuOpen } = useSite();
  const { clock } = useNight();

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
        columnGap: 12,
        alignItems: "center",
        padding: "calc(10px + env(safe-area-inset-top, 0px)) clamp(14px,4vw,56px) 10px",
        background: "linear-gradient(#000000F2,#00000000)",
      }}
    >
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="eyebrow"
        style={{ justifySelf: "start", minHeight: 44, background: "none", border: 0, padding: "0 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, color: "var(--bone)" }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ width: 22, height: 1, background: "var(--bone)" }} />
          <span style={{ width: 14, height: 1, background: "var(--bone)" }} />
        </span>
        {t.nav.menu}
      </button>
      <Link href="/" aria-label="Velvique" style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <Logo height="clamp(12px, 3.4vw, 22px)" />
      </Link>
      <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 14 }}>
        <span className="eyebrow header-clock" style={{ fontVariantNumeric: "tabular-nums" }} aria-live="polite">
          {clock}
        </span>
        <LangToggle />
      </div>
    </header>
  );
}
