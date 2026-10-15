"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { Logo } from "@/components/chrome/Logo";
import { Footer } from "@/components/chrome/Footer";
import { Slab } from "@/components/bits/Slab";

/**
 * `/verificar`: check a bottle by the serial on its card. The page explains itself for people who have never
 * heard of a blockchain: what the number is, how the record works, what you will see, and what to do if it fails.
 */
export function VerifyForm() {
  const { t } = useSite();
  const v = t.verificar;
  useClockLabel(v.ts);
  const router = useRouter();
  const [serial, setSerial] = useState("");

  return (
    <main>
      <section id="verificar" className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 56 }}>
        <RuleRow left={v.ts} right={v.kicker} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: "clamp(40px,6vw,96px)", alignItems: "center" }}>
          <div className="stack" style={{ gap: 28 }}>
            <h1 className="display display--xl">{v.h}</h1>
            <span className="gold-rule" aria-hidden />
            <p className="lede" style={{ margin: 0, maxWidth: "34em" }}>
              {v.lede}
            </p>
            <form
              className="stack"
              style={{ gap: 18, maxWidth: 520 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (serial.trim()) router.push(`/verificar/${encodeURIComponent(serial.trim().toUpperCase())}`);
              }}
            >
              <label className="field field--code eyebrow">
                {v.input}
                <input value={serial} onChange={(e) => setSerial(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="characters" />
              </label>
              <span className="eyebrow" style={{ lineHeight: 1.7 }}>
                {v.input_hint}
              </span>
              <button type="submit" className="btn btn--led" style={{ alignSelf: "flex-start" }} disabled={!serial.trim()}>
                {v.go}
              </button>
            </form>
          </div>
          {/* The card under the bottle, drawn: shows people exactly where the serial lives. Not a photo. */}
          <div className="serial-card paper" aria-hidden>
            <Logo width="58%" style={{ display: "block" }} />
            <span className="serial-card__rule" />
            <span className="eyebrow serial-card__label">{v.input}</span>
            <span className="serial-card__num">VQ · 0000 · 0000</span>
            <span className="eyebrow serial-card__foot">velvique.com/verificar</span>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="gutter section wrap stack" style={{ gap: 40 }}>
        <RuleRow left="I" right={v.how_t} />
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: "clamp(28px,4vw,56px)" }}>
          {v.how.map(([n, h, p]) => (
            <li key={n} className="stack hairline-gold" style={{ gap: 10, paddingTop: 20 }}>
              <span className="eyebrow gold-num">{n}</span>
              <span style={{ fontSize: 24 }}>{h}</span>
              <span className="lede" style={{ fontSize: 16 }}>
                {p}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="gutter section wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: "clamp(40px,6vw,96px)", alignItems: "start" }}>
        <div className="stack" style={{ gap: 24 }}>
          <RuleRow left="II" right={v.why_t} />
          <p className="lede" style={{ margin: 0, fontSize: "clamp(18px,1.8vw,22px)", color: "var(--bone-soft)" }}>
            {v.why_p}
          </p>
        </div>
        <div className="stack" style={{ gap: 24 }}>
          <RuleRow left="III" right={v.see_t} />
          <Slab size={560}>
            <ul className="lit-list">
              {v.see.map(([h, p]) => (
                <li key={h}>
                  <span className="lit-list__name">{h}</span>
                  <p className="lit-list__line">{p}</p>
                </li>
              ))}
            </ul>
          </Slab>
        </div>
      </section>

      <section className="gutter section wrap stack" style={{ gap: 32, maxWidth: 900 }}>
        <RuleRow left="IV" right={v.faq_t} />
        <div className="stack">
          {v.faq.map(([q, a]) => (
            <details key={q} className="hairline-top faq">
              <summary>{q}</summary>
              <p className="lede" style={{ fontSize: 16, margin: 0 }}>
                {a}
              </p>
            </details>
          ))}
        </div>
        <a href="#verificar" className="btn" style={{ alignSelf: "flex-start" }}>
          {v.go}
        </a>
      </section>
      <Footer />
    </main>
  );
}
