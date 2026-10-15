"use client";

import { useState } from "react";
import Link from "next/link";
import { Tier } from "@velvique/contracts";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel, useNight } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { Evidence } from "@/components/ui/Evidence";
import { BlurText } from "@/components/bits/BlurText";
import { Footer } from "@/components/chrome/Footer";
import { Edge } from "@/components/bits/Edge";
import { Swap } from "@/components/bits/Swap";
import { Shiny } from "@/components/bits/Shiny";
import { Pull } from "@/components/bits/Pull";
import { usePass } from "@/lib/chain/hooks";

type Form = { venue: string; kind: string; city: string; volume: string; name: string; email: string; phone: string; note: string; website: string };

/**
 * Wholesale page. The request form needs no wallet: it posts to /api/mayoreo, which relays it to the brand's
 * inbox by email (Brevo) and stores nothing. Wholesale pricing still unlocks with the Mayoreo pass.
 */
export function Mayoreo() {
  const { t, lang } = useSite();
  const m = t.mayoreo;
  useClockLabel(m.ts);
  const { flash } = useNight();
  const pass = usePass();
  const [form, setForm] = useState<Form>({ venue: "", kind: m.kinds[0] ?? "", city: "", volume: "", name: "", email: "", phone: "", note: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const ready = form.venue.trim() && form.city.trim() && form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const send = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/mayoreo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, lang }) });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      flash();
    } catch {
      setState("error");
    }
  };

  const input = (k: keyof Form, label: string, type = "text", autoComplete?: string) => (
    <label className="field eyebrow" key={k}>
      {label}
      <input type={type} value={form[k]} autoComplete={autoComplete} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );

  return (
    <main>
      <section className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 56 }}>
        <RuleRow left={m.ts} right="B2B" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(40px,6vw,96px)", alignItems: "center" }}>
          <div className="stack" style={{ gap: 28 }}>
            <h1 className="display display--xl">{m.h}</h1>
            <span className="gold-rule" aria-hidden />
            <BlurText text={m.lede} className="lede" />
            <p className="lede">{m.story_p}</p>
            <span className="eyebrow">{m.creds}</span>
          </div>
          <div style={{ aspectRatio: "4/5", position: "relative" }}>
            <Evidence slot="vq-led-table" />
          </div>
        </div>

        <div className="offer">
          <div className="offer__copy">
            <div className="eyebrow">{m.offer_t}</div>
            <h2 className="display display--lg">{m.offer_h}</h2>
            <span className="gold-rule" aria-hidden />
          </div>
          <Swap
            label={m.offer_t}
            cards={m.offer.map(([n, h, p]) => ({
              key: n,
              body: (
                <>
                  <span className="flyer flyer--lg gold-num">{n}</span>
                  <span className="stack" style={{ gap: 12 }}>
                    <span className="slab-title">{h}</span>
                    <span className="lit-list__line">{p}</span>
                  </span>
                </>
              ),
            }))}
          />
        </div>

        <div className="terms">
          <Edge quiet>
            <div className="eyebrow">{m.formats_t}</div>
            {m.formats.map(([a, b]) => (
              <div key={a} className="hairline-top" style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="flyer flyer--md">{a}</span>
                <span className="eyebrow">{b}</span>
              </div>
            ))}
          </Edge>
          <Edge quiet>
            <div className="eyebrow">{m.moq_t}</div>
            <p className="lede" style={{ fontSize: 17 }}>
              {m.moq_p}
            </p>
            <div className="eyebrow" style={{ paddingTop: 12 }}>
              {m.regions_t}
            </div>
            <p className="lede" style={{ fontSize: 17 }}>
              {m.regions_p}
            </p>
          </Edge>
          <Edge quiet>
            <div className="eyebrow">{m.pricing_t}</div>
            {pass.tier >= Tier.Mayoreo ? (
              <>
                <p className="lede" style={{ fontSize: 17 }}>
                  {m.pricing_open}
                </p>
                <Link href="/tienda" className="btn btn--led">
                  {t.nav.n5}
                </Link>
              </>
            ) : (
              <p className="lede" style={{ fontSize: 17 }}>
                {m.pricing_locked}
              </p>
            )}
          </Edge>
        </div>

        {pass.tier < Tier.Mayoreo ? (
          <div style={{ position: "relative", maxWidth: 720 }}>
          <Edge>
            <h2 className="display display--lg">{m.form_t}</h2>
            <p className="lede" style={{ fontSize: 16 }}>
              {m.form_p}
            </p>
            {state === "sent" ? (
              <p className="caption-i" role="status">
                {m.sent}
              </p>
            ) : (
              <>
                {input("venue", m.f_venue)}
                <label className="field eyebrow">
                  {m.f_kind}
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    {m.kinds.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                {input("city", m.f_city)}
                {input("volume", m.f_volume)}
                {input("name", m.f_name, "text", "name")}
                {input("email", m.f_email, "email", "email")}
                {input("phone", m.f_phone, "tel", "tel")}
                <label className="field eyebrow">
                  {m.f_note}
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                {/* Honeypot for bots: off-screen, skipped by keyboard and screen readers. */}
                <input tabIndex={-1} aria-hidden autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
                {state === "error" ? <p role="alert" className="caption-i">{m.error}</p> : null}
                <Pull>
                  <button type="button" className="btn btn--led" onClick={send} disabled={!ready || state === "sending"}>
                    {state === "sending" ? <Shiny text={m.sending} /> : m.send}
                  </button>
                </Pull>
              </>
            )}
          </Edge>
          </div>
        ) : null}
      </section>
      <Footer />
    </main>
  );
}
