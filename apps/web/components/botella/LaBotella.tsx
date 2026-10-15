"use client";

import Link from "next/link";
import { useSite } from "@/components/providers/SiteProvider";
import { NightSection } from "@/components/motion/NightSection";
import { LightsOut } from "@/components/motion/LightsOut";
import { SplitText } from "@/components/bits/SplitText";
import { BlurText } from "@/components/bits/BlurText";
import { Evidence } from "@/components/ui/Evidence";
import { Glow, RuleRow } from "@/components/ui/primitives";
import { Footer } from "@/components/chrome/Footer";
import { Slab } from "@/components/bits/Slab";
import { Edge } from "@/components/bits/Edge";
import { Seal } from "@/components/bits/Seal";
import { Flash } from "@/components/bits/Flash";
import { BottleStage } from "@/scene/BottleStage";
import { Story } from "./Story";

export function LaBotella() {
  const { t } = useSite();
  const b = t.botella;

  return (
    <main>
      {/* The bottle on the 4 AM table: orbit all the way around and zoom; it never leaves its spot. */}
      <LightsOut>
        <NightSection time="4:00 AM" label="Botella" className="gutter" style={{ minHeight: "100svh", paddingTop: 84, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 24 }}>
          <div data-dim>
            <RuleRow left="IV" right={<SplitText text={b.ts} />} />
          </div>
          <div style={{ position: "relative", display: "grid", placeItems: "center", minHeight: "min(76svh,860px)" }}>
            <Glow size="min(120vw,820px)" opacity={0.6} />
            {/* Full bleed: the canvas spans the viewport so the table and glow never stop at a box edge. */}
            <div style={{ position: "relative", width: "100vw", marginInline: "calc(50% - 50vw)", height: "min(76svh,860px)" }}>
              <BottleStage fallbackSlot="vq-led-table" table interactive cameraZ={5.2} />
            </div>
          </div>
          <div data-dim className="hairline-top" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 20, alignItems: "end", paddingTop: 22, paddingBottom: 32 }}>
            <h1 className="display display--lg">{b.h}</h1>
            <p className="lede">{b.lede}</p>
          </div>
        </NightSection>
      </LightsOut>

      <Story />

      <NightSection time="4:20 AM" label="Líquido" className="gutter section wrap stack" style={{ gap: 48 }}>
        <RuleRow left="I" right={b.liquid_t} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(40px,6vw,96px)", alignItems: "center" }}>
          <div style={{ aspectRatio: "4/5", position: "relative" }}>
            <Flash>
              <Evidence slot="vq-pour" />
            </Flash>
          </div>
          <div className="stack" style={{ gap: 32 }}>
            <BlurText text={b.liquid_p} className="lede" style={{ fontSize: "clamp(19px,2vw,24px)", color: "var(--bone-soft)" }} />
            <div>
              <div className="eyebrow" style={{ paddingBottom: 14 }}>
                {b.process_t}
              </div>
              <Slab size={460}>
                <ol className="lit-list">
                  {b.process.map(([n, h, p]) => (
                    <li key={n} className="step">
                      <span className="flyer flyer--md gold-num">{n}</span>
                      <span className="stack" style={{ gap: 6 }}>
                        <span className="lit-list__name">{h}</span>
                        <span className="lit-list__line">{p}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Slab>
            </div>
          </div>
        </div>
      </NightSection>

      <NightSection time="4:45 AM" label="Notas" className="gutter section wrap stack" style={{ gap: 40 }}>
        <RuleRow left="II" right={b.notes_t} />
        <Slab size={640}>
          <ul className="lit-list">
            {b.notes.map(([k, v]) => (
              <li key={k}>
                <span className="flyer flyer--lg">{k}</span>
                <p className="lit-list__name" style={{ margin: 0 }}>
                  {v}
                </p>
              </li>
            ))}
          </ul>
        </Slab>
        <div className="stack" style={{ gap: 28, paddingTop: 24 }}>
          <div className="eyebrow">{b.certs_t}</div>
          <ul className="seals">
            {b.certs.map(([k, v]) => (
              <li key={k}>
                <Seal text={`${k} · Velvique · México`} size={168}>
                  <span className="flyer flyer--md">{k}</span>
                </Seal>
                <p className="lit-list__line" style={{ textAlign: "center" }}>
                  {v}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </NightSection>

      <LightsOut>
        <NightSection time="5:02 AM" label="La luz" className="gutter section wrap" style={{ position: "relative", display: "grid", placeItems: "center", textAlign: "center", minHeight: "80svh" }}>
          <Glow size="min(100vw,620px)" />
          <div className="stack" style={{ gap: 28, alignItems: "center", position: "relative", maxWidth: 720 }}>
            <span data-dim className="eyebrow">
              III · {b.led_t}
            </span>
            <h2 data-led className="display display--xl" style={{ color: "var(--led-core)", textShadow: "0 0 24px #4EA9D566" }}>
              {b.h}
            </h2>
            <p data-dim className="lede" style={{ maxWidth: "32em" }}>
              {b.led_p}
            </p>
          </div>
        </NightSection>
      </LightsOut>

      <NightSection time="5:20 AM" label="Rituales" className="gutter section wrap stack" style={{ gap: 40 }}>
        <RuleRow left="IV" right={b.serve_t} />
        <div className="rituals">
          {b.serve.map(([k, v]) => (
            <Edge key={k} quiet>
              <span className="slab-title">{k}</span>
              <span className="lit-list__line">{v}</span>
            </Edge>
          ))}
        </div>
      </NightSection>

      <NightSection time="5:48 AM" label="Apertura" className="gutter section wrap stack" style={{ gap: 48 }}>
        <RuleRow left="V" right={b.unbox_t} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(40px,6vw,96px)", alignItems: "center" }}>
          <div className="stack" style={{ gap: 28 }}>
            <h2 className="display display--lg">{b.unbox_t}</h2>
            <p className="lede">{b.unbox_p}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/ar" className="btn btn--led">
                {b.ar_cta}
              </Link>
              <Link href="/verificar" className="btn">
                {b.verify_cta}
              </Link>
            </div>
          </div>
          <div style={{ aspectRatio: "4/3", position: "relative" }}>
            <Flash>
              <Evidence slot="vq-unbox" />
            </Flash>
          </div>
        </div>
      </NightSection>

      <Footer />
    </main>
  );
}
