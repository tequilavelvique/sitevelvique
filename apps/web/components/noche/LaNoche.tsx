"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSite } from "@/components/providers/SiteProvider";
import { useNight } from "@/components/providers/NightProvider";
import { NightSection } from "@/components/motion/NightSection";
import { LightsOut } from "@/components/motion/LightsOut";
import { SplitText } from "@/components/bits/SplitText";
import { BlurText } from "@/components/bits/BlurText";
import { ScrollVelocity } from "@/components/bits/ScrollVelocity";
import { Prints } from "@/components/bits/Prints";
import { Slab } from "@/components/bits/Slab";
import { Flash } from "@/components/bits/Flash";
import { Evidence } from "@/components/ui/Evidence";
import { Glow, Meme, RuleRow } from "@/components/ui/primitives";
import { Footer } from "@/components/chrome/Footer";
import { BottleStage } from "@/scene/BottleStage";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { mediaUrl } from "@/lib/media";
import type { MediaSlot } from "@velvique/content";
import { Logo } from "@/components/chrome/Logo";

/** How close the first clip starts inside the iris before it settles to fill the frame. */
const INSIDE_ZOOM = 1.6;

export function LaNoche() {
  const { t, gateOpen } = useSite();
  const { scrollTo } = useNight();
  const n = t.noche;

  // Menu links land here as /#after etc.
  useEffect(() => {
    if (gateOpen || !window.location.hash) return;
    const id = window.location.hash;
    requestAnimationFrame(() => scrollTo(id));
  }, [gateOpen, scrollTo]);

  // The liquid drifts a third of a screen over the whole night: slower than the content, so content floats past.
  const main = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        "[data-night-liquid] .hero-inside__glass",
        { yPercent: 0 },
        { yPercent: -30, ease: "none", scrollTrigger: { trigger: main.current, start: "top top", end: "bottom bottom", scrub: true } },
      );
    },
    { scope: main },
  );

  return (
    // Own stacking context, so the fixed liquid (z -1) sits above the page background and below every section.
    <main ref={main} style={{ position: "relative", zIndex: 1 }}>
      <div data-night-liquid className="night-liquid" aria-hidden>
        <div className="hero-inside__glass" />
      </div>
      <Llegada />

      {/* II · Evidencia */}
      {/* With motion on, this clip opens inside the hero's iris instead; shown here only for reduced motion. */}
      <NightSection time="12:30 AM" label="02 Evidencia" className="gutter section wrap stack evidencia-still" style={{ gap: 40 }}>
        <RuleRow left="II" right={<SplitText text={n.e_ts} />} />
        <div style={{ position: "relative", width: "100%", maxWidth: 820, margin: "0 auto", aspectRatio: "4/5" }}>
          <Evidence slot="vq-night-crowd" sizes="(max-width: 860px) 100vw, 820px" />
          <Meme lines={[n.m2a, n.m2b]} />
        </div>
      </NightSection>

      <ScrollVelocity items={t.memes.map(([a, b]) => `${a} / ${b}`)} />

      <AfterStrip />

      {/* IV · Luces fuera */}
      <LightsOut>
        <NightSection id="botella" time="4:00 AM" label="04 Luces fuera" className="gutter section wrap stack" style={{ gap: 56 }}>
          <div data-dim>
            <RuleRow left="IV" right={<SplitText text={n.b_ts} />} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: "clamp(48px,7vw,112px)", alignItems: "center" }}>
            <div style={{ position: "relative", display: "grid", placeItems: "center", padding: "40px 0" }}>
              <Glow size="min(110vw,640px)" opacity={0.8} />
              <div style={{ position: "relative", width: "min(84%,420px)", aspectRatio: "4/5" }}>
                <Evidence slot="vq-led-table" sizes="(max-width: 900px) 84vw, 420px" />
              </div>
            </div>
            <div className="stack" style={{ gap: 32 }}>
              <h2 className="display display--lg" style={{ color: "#fff" }}>
                {n.b_h}
              </h2>
              <span className="gold-rule" aria-hidden />
              <BlurText text={n.b_p} className="lede lede--lit" />
              <Slab size={520}>
                <div className="kv">
                  {[
                    [n.k1, n.v1],
                    [n.k2, n.v2],
                    [n.k3, n.v3],
                    [n.k4, n.v4],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="eyebrow gold-num">{k}</span>
                      <span className="v" style={{ color: "#fff" }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </Slab>
              <Link href="/la-botella" className="eyebrow hit" style={{ color: "var(--bone)" }}>
                {t.nav.n2} &rarr;
              </Link>
            </div>
          </div>
        </NightSection>
      </LightsOut>

      <LoQueQuedo />

      {/* VI · Amanecer */}
      <NightSection id="invitacion" time="6:12 AM" label="06 Amanecer" style={{ paddingBottom: "clamp(112px,16vw,200px)" }}>
        <div className="gutter wrap" style={{ paddingBottom: 40 }}>
          <RuleRow left="VI" right={<SplitText text={n.d_ts} />} />
        </div>
        {/* The bottle itself, still lit on the table: the 3D stage, with the dawn photo as its no-WebGL fallback. */}
        <div style={{ position: "relative", display: "grid", placeItems: "center", minHeight: "min(76svh,860px)" }}>
          <Glow size="min(120vw,820px)" opacity={0.6} />
          <div style={{ position: "relative", width: "100%", height: "min(76svh,860px)" }}>
            <BottleStage fallbackSlot="vq-dawn" table interactive cameraZ={5.2} />
          </div>
        </div>
        <div className="gutter" style={{ paddingTop: "clamp(72px,10vw,128px)", maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
          <h2 className="display" style={{ fontSize: "clamp(40px,7vw,88px)", lineHeight: 1 }}>
            {n.d_h}
          </h2>
          <p className="lede" style={{ maxWidth: "28em" }}>
            {n.d_p}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, paddingTop: 12 }}>
            <Link href="/acceso" className="btn btn--led">
              {n.cta}
            </Link>
            <Link href="/acceso?scan=1" className="btn">
              {n.scan}
            </Link>
          </div>
        </div>
      </NightSection>

      <Footer />
    </main>
  );
}

/*
 * I · Llegada. The route's one orchestrated moment: the hero pins and scroll dives the camera through the glass.
 * The wordmark falls away behind as depth (it grows and softens, it never slides), the bottle tips its mouth
 * toward the lens, the camera rushes the opening, and an iris opens from the mouth onto the inside: dark
 * liquid, the label's light coming up through it. The pin lets go while you are inside, so the night's first section rises out of it.
 */
function Llegada() {
  const { t } = useSite();
  const n = t.noche;
  const dive = useRef(0);
  const stage = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      if (prefersReducedMotion()) return;
      const depth = { v: 0 };
      // Phones: a shorter pin (one long thumb-flick, not three) and no blur filters on scrubbed full-screen layers.
      const phone = window.matchMedia("(max-width: 767px)").matches;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: phone ? "+=150%" : "+=210%", scrub: phone ? 0.6 : 1.1, pin: true, anticipatePin: 1 },
      });
      // Timeline runs 0..1; positions below read as fractions of the dive.
      tl.to(depth, { v: 1, duration: 0.64, ease: "none", onUpdate: () => (dive.current = depth.v) }, 0)
        .to(q("[data-hero-ts], [data-hero-foot]"), { autoAlpha: 0, y: -16, duration: 0.14, ease: "power1.in" }, 0)
        .to(q("[data-hero-word]"), { scale: 1.75, autoAlpha: 0, ...(phone ? {} : { filter: "blur(8px)" }), duration: 0.5, ease: "power1.in" }, 0)
        .to(q("[data-hero-glow]"), { scale: 1.7, opacity: 1, duration: 0.46, ease: "power2.in" }, 0)
        .to(q("[data-hero-glow]"), { autoAlpha: 0, duration: 0.18 }, 0.5)
        .to(q("[data-hero-bottle]"), { scale: 1.1, duration: 0.64, ease: "power2.in" }, 0)
        // Through the mouth: the camera crosses it at dive 0.8 (0.51 here); the iris opens from the opening.
        .set(q("[data-hero-inside]"), { autoAlpha: 1 }, 0.49)
        .fromTo(el, { "--iris": "0%" }, { "--iris": "150%", duration: 0.34, ease: "power2.in" }, 0.49)
        .fromTo(q("[data-hero-rim]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.49)
        .to(q("[data-hero-rim]"), { autoAlpha: 0, duration: 0.14 }, 0.72)
        .set(q("[data-hero-bottle]"), { autoAlpha: 0 }, 0.86)
        // Inside: the first clip of the night, shown in the iris. It starts close and settles to fill the frame as
        // the iris reaches the edges, so the opening reads as a lens pushing through, never as a page scrolling.
        .fromTo(q("[data-hero-photo]"), { scale: INSIDE_ZOOM }, { scale: 1, duration: 0.36, ease: "power2.out" }, 0.49)
        .fromTo(q("[data-hero-meme]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power1.out" }, 0.8)
        // Hand-off: the fixed liquid comes up under the interior, so the unpin scrolls into the same liquid.
        // (Looked up on the document: the liquid lives outside this stage, and string targets here are scoped to it.)
        .to(document.querySelector("[data-night-liquid]"), { autoAlpha: 1, duration: 0.08 }, 0.88)
        .to({}, { duration: 0.1 }, 0.9);
    },
    { scope: stage },
  );

  return (
    <NightSection id="llegada" time="11:48 PM" label="01 Llegada" reveal={false}>
      <div
        ref={stage}
        className="gutter hero-stage"
      >
        <div data-hero-ts className="eyebrow center">
          {n.h_ts}
        </div>
        <div style={{ position: "relative", display: "grid", placeItems: "center", minHeight: 0 }}>
          <div data-hero-glow style={{ position: "absolute", inset: 0, opacity: 0.85 }}>
            <Glow size="min(120vw,760px)" />
          </div>
          <h1
            data-hero-word
            style={{
              gridArea: "1/1",
              margin: 0,
              fontWeight: 400,
              fontSize: "clamp(54px,16.5vw,250px)",
              lineHeight: 1,
              letterSpacing: ".06em",
              marginRight: "-.06em",
              textTransform: "uppercase",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <Logo width="min(88vw, 1300px)" shine style={{ display: "block" }} />
          </h1>
        </div>
        {/* The canvas is the whole stage (= the viewport while pinned): the dive's axis is the screen's center on
            every device, and the neck fills the frame edge to edge on the way in. */}
        <div data-hero-bottle className="hero-bottle">
          <BottleStage fallbackSlot="vq-hero-bottle" dive={dive} interactive="turn" cameraZ={6.6} />
        </div>
        <div data-hero-foot className="hairline-top hero-foot">
          <div className="eyebrow hero-foot__kind">Añejo Cristalino</div>
          <div className="caption-i center hero-foot__cap">
            <div>
              {n.m1a} {n.m1b}
            </div>
            <div>Velvique: {n.m1c}</div>
          </div>
          <div className="eyebrow hero-foot__say">
            Vel · vee · keh
          </div>
        </div>
        <div data-hero-rim className="hero-rim" aria-hidden />
        <div data-hero-inside className="hero-inside">
          <div data-hero-photo className="hero-inside__photo">
            <Evidence slot="vq-night-crowd" sizes="100vw" flat />
          </div>
          <div data-hero-meme className="gutter hero-inside__meme">
            <RuleRow left="II" right={n.e_ts} />
            <Meme lines={[n.m2a, n.m2b]} style={{ position: "static" }} />
          </div>
        </div>
      </div>
    </NightSection>
  );
}

/*
 * III · El after: the prints from the night, thrown on the table, two of them still moving (silent clips). React Bits Stack: drag the top one away (or tap,
 * or arrow keys) and it goes under the pile; the frame number and time beside it follow whichever print is up.
 */
function AfterStrip() {
  const { t } = useSite();
  const n = t.noche;
  const frames: { slot: MediaSlot; time: string }[] = [
    { slot: "vq-after-1", time: "2:10 AM" },
    { slot: "vq-night-booth", time: "2:24 AM" },
    { slot: "vq-after-2", time: "2:47 AM" },
    { slot: "vq-flash-01", time: "3:02 AM" },
    { slot: "vq-after-3", time: "3:15 AM" },
    { slot: "vq-night-dark", time: "3:31 AM" },
    { slot: "vq-after-4", time: "3:58 AM" },
  ];
  const [top, setTop] = useState(0);
  const up = frames[top] ?? frames[0]!;

  return (
    <NightSection id="after" time="2:10 AM" label="03 El after" className="gutter wrap--wide" style={{ paddingBlock: "var(--section)" }}>
      <RuleRow left="III" right={<SplitText text={n.a_ts} />} />
      <div className="after-table">
        <div className="after-table__copy">
          <h2 className="display display--xl">{n.a_h}</h2>
          <div className="after-table__frame" aria-live="polite">
            <span className="flyer flyer--xl">{String(top + 1).padStart(2, "0")}</span>
            <span className="stack" style={{ gap: 8 }}>
              <span className="flyer flyer--md">{up.time}</span>
              <span className="eyebrow">
                {top + 1} / {frames.length}
              </span>
            </span>
          </div>
          <p className="caption-i" style={{ margin: 0, maxWidth: "24em" }}>
            {n.a_hint}
          </p>
          <Link href="/el-after" className="btn" style={{ alignSelf: "flex-start" }}>
            {t.nav.n3}
          </Link>
        </div>
        <div className="after-table__pile">
          <Prints
            label={n.a_pile}
            onTop={setTop}
            prints={frames.map((f, i) => (
              <Evidence key={f.slot} slot={f.slot} sizes="(max-width: 700px) 80vw, 440px" flat>
                {i === 0 ? <Meme lines={t.memes[0] ?? []} /> : null}
              </Evidence>
            ))}
          />
        </div>
      </div>
    </NightSection>
  );
}

/* V · Lo que quedó: guest list, wristband, receipt. Found objects, not marketing. */
function LoQueQuedo() {
  const { t } = useSite();
  const n = t.noche;
  return (
    <NightSection time="5:30 AM" label="05 Lo que quedó" className="gutter section wrap stack" style={{ gap: 40 }}>
      <RuleRow left="V" right={<SplitText text={n.l_ts} />} />
      <h2 className="display display--xl center" style={{ lineHeight: 1 }}>
        {n.l_h}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,270px),1fr))", gap: "clamp(56px,6vw,72px) clamp(28px,4vw,56px)", alignItems: "start", paddingTop: 32 }}>
        <div className="stack" style={{ gap: 22 }}>
          <div data-flash-photo>
          <Flash className="paper" background="var(--bone)" style={{ padding: "28px 26px", transform: "rotate(-1.4deg)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", color: "var(--paper-muted)" }}>{n.g_t}</div>
            <div style={{ fontSize: 20, textDecoration: "line-through" }}>Mariana R. +1</div>
            <div style={{ fontSize: 20, textDecoration: "line-through" }}>Sofi</div>
            <div style={{ fontSize: 20, textDecoration: "line-through" }}>{n.g_gdl}</div>
            <div style={{ fontSize: 20 }}>{n.g_late}</div>
            <div style={{ fontSize: 20, fontWeight: 600, borderTop: "1px solid var(--paper-ink)", paddingTop: 10 }}>+1 Velvique</div>
          </Flash>
          </div>
          <div className="eyebrow" style={{ display: "flex", gap: 14 }}>
            <span>I</span>
            <span>{n.o1}</span>
          </div>
        </div>

        <div className="stack" style={{ gap: 22, paddingTop: 48 }}>
          <div data-flash-photo>
          <Flash className="paper" background="var(--bone)" style={{ padding: "16px 20px", transform: "rotate(2deg)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12, letterSpacing: ".28em", textTransform: "uppercase" }}>
            <Logo height={14} />
            <span>{n.w_t}</span>
          </Flash>
          </div>
          <div className="eyebrow" style={{ display: "flex", gap: 14, paddingTop: 20 }}>
            <span>II</span>
            <span>{n.w_c}</span>
          </div>
        </div>

        <div className="stack" style={{ gap: 22 }}>
          <div data-flash-photo>
          <Flash className="paper paper--receipt" background="var(--paper)" style={{ padding: "26px 24px", transform: "rotate(1deg)", fontSize: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="center" style={{ fontFamily: "var(--font-serif), serif", letterSpacing: ".38em", textTransform: "uppercase", fontSize: 13, paddingBottom: 10 }}>
              Velvique
            </div>
            <Line a={n.r1} b="✓" />
            <Line a={n.r2} b="×6" />
            <Line a={n.r3} b="?" />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px dashed var(--paper-ink)", paddingTop: 8, fontWeight: 600 }}>
              <span>Total</span>
              <span>{n.r_total}</span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--paper-muted)", paddingTop: 6 }}>{n.r_ts}</div>
          </Flash>
          </div>
          <div className="eyebrow" style={{ display: "flex", gap: 14 }}>
            <span>III</span>
            <span>{n.o3}</span>
          </div>
        </div>

        <Witness />
      </div>
    </NightSection>
  );
}

/* IV · The witness: the one piece of evidence that gets the light. Full row, rays from behind the head. */
function Witness() {
  const { t, media, lang } = useSite();
  const entry = media["vq-kosher"];
  const src = mediaUrl(entry?.uri);
  if (!src) return null;
  return (
    <div className="revelation-wrap">
      <div data-flash-photo className="revelation">
        <div className="revelation__aura" aria-hidden />
        <div className="revelation__rays" aria-hidden />
        <div className="revelation__rays revelation__rays--counter" aria-hidden />
        <div className="revelation__halo" aria-hidden />
        <Image src={src} alt={entry.alt[lang]} fill sizes="(max-width: 700px) 86vw, 620px" className="revelation__figure" />
      </div>
      <div className="eyebrow" style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        <span>IV</span>
        <span>{t.noche.o4}</span>
      </div>
    </div>
  );
}

function Line({ a, b }: { a: string; b: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{a}</span>
      <span>{b}</span>
    </div>
  );
}
