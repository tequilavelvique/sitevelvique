"use client";

import { REGIONS, regionOf } from "@velvique/content";
import { fill, useSite } from "@/components/providers/SiteProvider";
import { LangToggle } from "@/components/ui/primitives";
import { Logo } from "@/components/chrome/Logo";

/**
 * Region-aware legal drinking age gate (18 MX/LATAM/EU, 21 US). The answer lives in memory for
 * this session only and is never stored. The chosen region also drives SKU region eligibility.
 */
export function AgeGate() {
  const { t, lang, gateOpen, denied, enter, deny, region, setRegion } = useSite();
  if (!gateOpen) return null;

  const R = regionOf(region);
  const ageQ = R.age ? fill(t.gate.ageQ, { n: R.age }) : t.gate.ageQany;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="gate-h" data-screen-label="00 Edad" style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--ink)", padding: 12, overflowY: "auto" }}>
      <div style={{ minHeight: "100%", border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8px clamp(14px,4vw,40px) 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <span />
          <Logo height="clamp(12px, 3.4vw, 22px)" />
          <span style={{ justifySelf: "end" }}>
            <LangToggle />
          </span>
        </div>

        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", padding: "48px 0", textAlign: "center" }}>
          {!denied ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
              <h1 id="gate-h" className="display" style={{ fontSize: "clamp(38px,9vw,64px)" }}>
                {t.gate.h}
              </h1>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
                <div className="eyebrow">{t.gate.where}</div>
                <div role="radiogroup" aria-label={t.gate.where} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                  {REGIONS.map((r) => (
                    <button key={r.k} type="button" className="pill" role="radio" aria-checked={r.k === region} onClick={() => setRegion(r.k)}>
                      {r[lang]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hairline-top" style={{ width: "100%", paddingTop: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
                <p style={{ margin: 0, fontSize: "clamp(20px,3vw,24px)", lineHeight: 1.4, color: "var(--bone-soft)", textWrap: "balance" }}>{ageQ}</p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
                  <button type="button" className="btn btn--bone" onClick={enter}>
                    {t.gate.yes}
                  </button>
                  <button type="button" className="btn" onClick={deny}>
                    {t.gate.no}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <h1 id="gate-h" className="display" style={{ fontSize: "clamp(38px,9vw,64px)" }}>
                {t.gate.den_h}
              </h1>
              <p className="lede" style={{ fontSize: 19, textWrap: "balance" }}>
                {t.gate.den_p}
              </p>
            </div>
          )}
        </div>

        <div className="cond center" style={{ fontSize: 12, letterSpacing: ".16em", color: "var(--muted)" }}>
          {t.gate.legal}
        </div>
      </div>
    </div>
  );
}
