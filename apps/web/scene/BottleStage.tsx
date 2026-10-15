"use client";

import dynamic from "next/dynamic";
import { preload } from "react-dom";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import type { MediaSlot } from "@velvique/content";
import { Evidence } from "@/components/ui/Evidence";
import { env } from "@/lib/env";
import { mediaUrl } from "@/lib/media";
import { BOTTLE_GLB } from "./bottle";
import { hasWebGL2, useDeviceTier } from "./useDeviceTier";

/**
 * The 3D scene streams after the shell: three.js never lands in the first-load bundle. The chunk request starts
 * as soon as this module evaluates (not after hydration and the tier probe), so it downloads in parallel with
 * the GLB instead of after it.
 */
const loadScene = () => import("./BottleScene");
if (typeof window !== "undefined") void loadScene();
const BottleScene = dynamic(loadScene, { ssr: false, loading: () => null });

export function BottleStage({
  fallbackSlot,
  table,
  spin,
  dive,
  interactive,
  cameraZ,
  style,
}: {
  fallbackSlot: MediaSlot;
  table?: boolean;
  spin?: MutableRefObject<number>;
  dive?: MutableRefObject<number>;
  interactive?: boolean | "turn";
  cameraZ?: number;
  style?: CSSProperties;
}) {
  // Hoisted into <head> during SSR: the GLB is in flight before any JS runs. Same mode as three's fetch so the
  // preloaded response is reused rather than downloaded twice.
  preload(BOTTLE_GLB, { as: "fetch", crossOrigin: "anonymous" });

  const ref = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useDeviceTier();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  // Demoted past tier 2 with no loop video to fall back on: keep the real bottle, drop post-processing.
  const [lite, setLite] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  // Pause the render loop when the canvas is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const loop = mediaUrl(env.bottleLoop);
  // Tier 3 means "spare the device". With a loop video, play it; without one, a lite 3D bottle beats a
  // placeholder card in the hero. Only a browser with no WebGL at all gets the still.
  const flat = tier === 3 && (Boolean(loop) || !hasWebGL2());
  const decline = () => {
    if (tier === 1) setTier(2);
    else if (loop) setTier(3);
    else setLite(true);
  };

  return (
    <div ref={ref} data-led style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      {flat ? (
        loop ? (
          <video src={loop} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <Evidence slot={fallbackSlot} style={{ background: "transparent" }} />
        )
      ) : (
        <>
          {/* While the glass loads, the label is already lit: the light first, then the bottle around it. */}
          <div className="bottle-pending" data-ready={ready || undefined} aria-hidden />
          {tier === null ? null : (
            <div className="bottle-canvas" data-ready={ready || undefined}>
              <BottleScene
                active={visible}
                tier={tier === 3 ? 2 : tier}
                lite={lite || tier === 3}
                onDecline={decline}
                onReady={onReady}
                table={table}
                spin={spin}
                dive={dive}
                interactive={interactive}
                cameraZ={cameraZ}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
