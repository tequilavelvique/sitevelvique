"use client";

import { useEffect, useRef, useState } from "react";
import { useSite } from "@/components/providers/SiteProvider";
import { useClockLabel, useNight } from "@/components/providers/NightProvider";
import { RuleRow } from "@/components/ui/primitives";
import { Footer } from "@/components/chrome/Footer";
import { env } from "@/lib/env";
import { mediaUrl, clockLabel } from "@/lib/media";
import type { ModelViewerElement } from "@/types/model-viewer";
import { BOTTLE_AR_GLB as src } from "@/scene/bottle";
import { composeFlashPhoto } from "./flashPhoto";

/**
 * "La botella en tu mesa": model-viewer covers both platforms.
 *  - Android: Scene Viewer (native ARCore, the most reliable path), falling back to `webxr` in the page.
 *  - iOS Safari: Quick Look with USDZ (from NEXT_PUBLIC_BOTTLE_USDZ, or auto-generated from the GLB).
 * AR loads the plain GLB (`BOTTLE_AR_GLB`), baked in meters, so the camera view places it at real size.
 * Controls sit in one bar above the viewer, on screen at load: open camera, flash photo, short video.
 * The video records the viewer's own canvas (the camera view itself runs outside the page and can't be recorded).
 */
const VIDEO_SECONDS = 8;

type Capture = { kind: "photo" | "video"; url: string; file: File };

export function ArTable() {
  const { t } = useSite();
  const a = t.ar;
  useClockLabel(a.ts);
  const { flash } = useNight();
  const mv = useRef<ModelViewerElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [recording, setRecording] = useState(0);
  const [capture, setCapture] = useState<Capture | null>(null);

  useEffect(() => {
    import("@google/model-viewer").then(() => setReady(true));
  }, []);

  useEffect(() => {
    const el = mv.current;
    if (!el) return;
    const onLoad = () => setLoaded(true);
    // The camera view could not start (no ARCore, no Google app, or WebXR refused).
    const onStatus = (e: Event) => (e as CustomEvent<{ status: string }>).detail.status === "failed" && setNote(a.unsupported);
    el.addEventListener("load", onLoad);
    el.addEventListener("ar-status", onStatus);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("ar-status", onStatus);
    };
  }, [ready, a.unsupported]);

  useEffect(() => () => void (capture && URL.revokeObjectURL(capture.url)), [capture]);
  // The result shows under the viewer: bring it on screen as soon as it exists.
  useEffect(() => {
    if (capture) document.getElementById("ar-capture")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [capture]);

  const openCamera = async () => {
    const el = mv.current;
    // Read at tap time: model-viewer picks the AR mode asynchronously and can change it after a failed attempt.
    if (el?.canActivateAR) {
      setNote(null);
      await el.activateAR().catch(() => setNote(a.unsupported));
    } else setNote(a.camera_phone);
  };

  const takePhoto = async () => {
    const el = mv.current;
    if (!el) return;
    flash();
    const blob = await el.toBlob({ mimeType: "image/jpeg", qualityArgument: 0.92, idealAspect: false });
    const out = await composeFlashPhoto(blob, { lines: t.memes[0] ?? [], stamp: clockLabel() });
    setCapture({ kind: "photo", url: URL.createObjectURL(out), file: new File([out], "velvique.jpg", { type: "image/jpeg" }) });
  };

  const recordVideo = () => {
    const el = mv.current;
    const canvas = el?.shadowRoot?.querySelector("canvas");
    if (!el || !canvas || typeof MediaRecorder === "undefined") return setNote(a.video_unsupported);
    if (recorder.current) return recorder.current.stop();

    const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(canvas.captureStream(30), type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: Blob[] = [];
    const wasRotating = el.hasAttribute("auto-rotate");
    el.setAttribute("auto-rotate", "");
    el.setAttribute("rotation-per-second", "45deg");

    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      if (!wasRotating) el.removeAttribute("auto-rotate");
      el.removeAttribute("rotation-per-second");
      recorder.current = null;
      setRecording(0);
      const mime = rec.mimeType || "video/webm";
      const blob = new Blob(chunks, { type: mime });
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      setCapture({ kind: "video", url: URL.createObjectURL(blob), file: new File([blob], `velvique.${ext}`, { type: mime }) });
    };

    recorder.current = rec;
    setNote(null);
    setCapture(null);
    rec.start(250);
    const started = Date.now();
    setRecording(VIDEO_SECONDS);
    const tick = setInterval(() => {
      const left = VIDEO_SECONDS - Math.floor((Date.now() - started) / 1000);
      if (left <= 0 || rec.state !== "recording") {
        clearInterval(tick);
        if (rec.state === "recording") rec.stop();
      } else setRecording(left);
    }, 250);
  };

  const share = async () => {
    if (!capture) return;
    const data = { files: [capture.file], title: "Velvique" };
    if (navigator.canShare?.(data)) await navigator.share(data).catch(() => undefined);
  };

  return (
    <main>
      <section className="gutter wrap stack" style={{ paddingTop: 120, paddingBottom: "var(--section)", gap: 28 }}>
        <RuleRow left={a.kicker} right={a.ts} />
        <h1 className="display display--xl">{a.h}</h1>
        <span className="gold-rule" aria-hidden />
        <p className="lede" style={{ margin: 0, maxWidth: "34em" }}>
          {a.p}
        </p>

        <div className="ar-bar">
          <button type="button" className="btn btn--led" onClick={openCamera} disabled={!loaded}>
            {a.place}
          </button>
          <button type="button" className="btn" onClick={takePhoto} disabled={!loaded || recording > 0}>
            {a.flash}
          </button>
          <button type="button" className="btn" onClick={recordVideo} disabled={!loaded}>
            {recording ? a.stop : a.video}
          </button>
        </div>
        {note ? (
          <p className="caption-i" role="status" style={{ margin: 0 }}>
            {note}
          </p>
        ) : null}

        <div className="ar-stage">
          {ready ? (
            <model-viewer
              ref={(el: HTMLElement | null) => {
                mv.current = el as ModelViewerElement | null;
              }}
              src={src}
              ios-src={mediaUrl(env.bottleUsdz) ?? undefined}
              alt="Velvique"
              // React 19 assigns this as the element's `ar` property: it must be `true`, since "" is falsy and disables AR.
              ar
              ar-modes="scene-viewer webxr quick-look"
              ar-placement="floor"
              ar-scale="fixed"
              camera-controls=""
              camera-orbit="0deg 78deg auto"
              touch-action="pan-y"
              environment-image="neutral"
              shadow-intensity="1"
              exposure="1.25"
              tone-mapping="aces"
              interaction-prompt="none"
              style={{ width: "100%", height: "100%", background: "transparent" }}
            >
              {/* Our own button bar drives the camera view; hide model-viewer's default one. */}
              <span slot="ar-button" hidden />
            </model-viewer>
          ) : null}
          <span className="eyebrow" style={{ position: "absolute", left: 16, top: 14, pointerEvents: "none" }}>
            {loaded ? a.drag : a.loading}
          </span>
          {recording ? (
            <span className="eyebrow ar-rec" aria-live="polite">
              {a.recording} · {recording}s
            </span>
          ) : null}
        </div>

        {capture ? (
          <div id="ar-capture" className="stack" style={{ gap: 16, maxWidth: 560 }}>
            {capture.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capture.url} alt="" style={{ width: "100%", display: "block", border: "1px solid var(--hairline)" }} />
            ) : (
              <video src={capture.url} controls playsInline loop autoPlay muted style={{ width: "100%", display: "block", border: "1px solid var(--hairline)" }} />
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button type="button" className="btn" onClick={share}>
                {a.share}
              </button>
              <a className="btn" href={capture.url} download={capture.file.name}>
                {a.download}
              </a>
              <button type="button" className="btn" onClick={() => setCapture(null)}>
                {a.retake}
              </button>
            </div>
          </div>
        ) : null}

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: "clamp(20px,3vw,40px)", paddingTop: 24 }} aria-label={a.steps_t}>
          {a.steps.map(([n, h, p]) => (
            <li key={n} className="stack hairline-gold" style={{ gap: 8, paddingTop: 16 }}>
              <span className="eyebrow gold-num">{n}</span>
              <span style={{ fontSize: 20 }}>{h}</span>
              <span className="lede" style={{ fontSize: 15 }}>
                {p}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <Footer />
    </main>
  );
}
