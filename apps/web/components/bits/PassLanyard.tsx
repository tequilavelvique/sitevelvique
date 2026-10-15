"use client";

import { BRAND } from "@/lib/brand";
import { useEffect, useState } from "react";
import RBLanyard from "@/components/reactbits/Lanyard/Lanyard";
import { TOKENS } from "@velvique/content";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";
import { PassCard } from "@/components/members/PassCard";

type Art = { front: string; back: string; strap: string };

const W = 1012;
const H = 638;

/** next/font hashes the family name; read it back from the CSS variable so the canvas uses the same face. */
const family = (v: string, fallback: string) => {
  const name = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return name ? `${name}, ${fallback}` : fallback;
};

const loadLogo = () =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous"; // Grove sends CORS headers; the canvas stays readable.
    img.src = BRAND.logo;
  });

/** The logo in one colour: draw its alpha, then fill through it. */
function tinted(logo: HTMLImageElement, color: string, w: number) {
  const h = Math.round((logo.height / logo.width) * w);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.drawImage(logo, 0, 0, w, h);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  return c;
}

/** True black card, ribs like the bottle's facets in gold at a whisper, an inset gold frame. */
function face(g: CanvasRenderingContext2D) {
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(78,169,213,0.07)";
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 22) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
    g.stroke();
  }
  g.strokeStyle = "#8A6A2C";
  g.strokeRect(26.5, 26.5, W - 53, H - 53);
}

async function draw(top: [string, string], bottom: [string, string]): Promise<Art> {
  await document.fonts.ready;
  const cond = family("--font-cond", "'Barlow Condensed', 'Arial Narrow', sans-serif");
  const logo = await loadLogo();

  const front = document.createElement("canvas");
  front.width = W;
  front.height = H;
  const f = front.getContext("2d")!;
  face(f);
  const glow = f.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.46);
  glow.addColorStop(0, "rgba(78,169,213,0.28)");
  glow.addColorStop(1, "rgba(78,169,213,0)");
  f.fillStyle = glow;
  f.fillRect(0, 0, W, H);
  const mark = tinted(logo, TOKENS.ledCore, Math.round(W * 0.68));
  f.shadowColor = "rgba(78,169,213,0.8)";
  f.shadowBlur = 28;
  f.drawImage(mark, (W - mark.width) / 2, (H - mark.height) / 2);
  f.shadowBlur = 0;
  f.font = `500 26px ${cond}`;
  f.fillStyle = TOKENS.bone;
  f.fillText(top[0].toUpperCase(), 62, 92);
  f.fillStyle = TOKENS.gold;
  f.textAlign = "right";
  f.fillText(top[1].toUpperCase(), W - 62, 92);
  f.font = `500 22px ${cond}`;
  f.textAlign = "left";
  f.fillStyle = TOKENS.bone;
  f.fillText(bottom[0], 62, H - 66);
  f.textAlign = "right";
  f.fillStyle = TOKENS.gold;
  f.fillText(bottom[1].toUpperCase(), W - 62, H - 66);

  const back = document.createElement("canvas");
  back.width = W;
  back.height = H;
  const b = back.getContext("2d")!;
  face(b);
  const small = tinted(logo, TOKENS.gold, Math.round(W * 0.34));
  b.drawImage(small, (W - small.width) / 2, H / 2 - small.height - 18);
  b.font = `500 24px ${cond}`;
  b.textAlign = "center";
  b.fillStyle = TOKENS.gold;
  b.fillText(bottom[1].toUpperCase(), W / 2, H / 2 + 42);
  b.fillStyle = TOKENS.bone;
  b.fillText(top[1].toUpperCase(), W / 2, H / 2 + 82);

  // The strap: black webbing, gold edges, the wordmark woven along it in gold.
  const strap = document.createElement("canvas");
  strap.width = 2048;
  strap.height = 96;
  const s = strap.getContext("2d")!;
  s.fillStyle = "#000";
  s.fillRect(0, 0, strap.width, strap.height);
  s.fillStyle = "#8A6A2C";
  s.fillRect(0, 6, strap.width, 2);
  s.fillRect(0, strap.height - 8, strap.width, 2);
  const word = tinted(logo, TOKENS.gold, 300);
  for (let x = 40; x < strap.width; x += 420) s.drawImage(word, x, (strap.height - word.height) / 2);

  return { front: front.toDataURL("image/png"), back: back.toDataURL("image/png"), strap: strap.toDataURL("image/png") };
}

/**
 * React Bits Lanyard: the membership pass hanging on its strap, the way it hangs at the door. Pull it, let it
 * swing, tap to flip it. The card art is drawn here in brand colours. Reduced motion, or while the art is
 * drawing, shows the flat pass instead.
 */
export function PassLanyard({ top, bottom, height = "min(78svh, 760px)" }: { top: [string, string]; bottom: [string, string]; height?: string }) {
  const still = useClientValue(prefersReducedMotion, false);
  const [art, setArt] = useState<Art | null>(null);
  const [t0, t1] = top;
  const [b0, b1] = bottom;

  useEffect(() => {
    if (still) return;
    let alive = true;
    draw([t0, t1], [b0, b1])
      .then((a) => alive && setArt(a))
      .catch(() => alive && setArt(null));
    return () => {
      alive = false;
    };
  }, [t0, t1, b0, b1, still]);

  if (still || !art) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: height }}>
        <PassCard top={top} bottomLeft={bottom[0]} bottomRight={bottom[1]} />
      </div>
    );
  }
  return (
    <div className="vq-lanyard" style={{ height }} role="img" aria-label={`${t0} · ${t1} · ${b1}`}>
      <RBLanyard
        frontImage={art.front}
        backImage={art.back}
        orientation="landscape"
        cardColor="#000000"
        finish="glossy"
        metal="gold"
        cornerRadius={0.08}
        size={0.7}
        strapImage={art.strap}
        strapColor="#000000"
        strapLength={0.55}
        breeze={0.25}
      />
    </div>
  );
}
