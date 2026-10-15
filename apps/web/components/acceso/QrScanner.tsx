"use client";

import { useEffect, useRef, useState } from "react";
import { useSite } from "@/components/providers/SiteProvider";
import { useClientValue } from "@/lib/use-client-value";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

const detectorCtor = () => (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
const canScan = () => Boolean(detectorCtor() && navigator.mediaDevices?.getUserMedia);

/**
 * Event QR scanner using the native BarcodeDetector (Chrome / Android, Safari 17+ behind support).
 * Frames are read in memory and dropped; nothing is recorded. Where unsupported, the phone camera app
 * opens the same invitation link directly.
 */
export function QrScanner({ onResult, onCancel }: { onResult: (text: string) => void; onCancel: () => void }) {
  const { t } = useSite();
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  useEffect(() => {
    cb.current = onResult;
  }, [onResult]);
  const supported = useClientValue(canScan, true);
  const [failed, setFailed] = useState(false);
  const unsupported = !supported || failed;

  useEffect(() => {
    const Ctor = detectorCtor();
    if (!Ctor || !supported) return;
    const detector = new Ctor({ formats: ["qr_code"] });
    let stream: MediaStream | null = null;
    let raf = 0;
    let done = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (done || !video.current) return;
          try {
            const [hit] = await detector.detect(video.current);
            if (hit?.rawValue) {
              done = true;
              cb.current(hit.rawValue);
              return;
            }
          } catch {
            /* frame not ready */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [supported]);

  if (unsupported) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <p className="caption-i" style={{ margin: 0 }}>
          {t.acceso.scan_hint}
        </p>
        <button type="button" className="btn" onClick={onCancel}>
          {t.acceso.type_code}
        </button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div style={{ position: "relative", aspectRatio: "1/1", border: "1px solid var(--hairline-strong)", overflow: "hidden" }}>
        <video ref={video} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.1)" }} />
        <div aria-hidden style={{ position: "absolute", inset: "18%", border: "1px solid var(--bone)" }} />
      </div>
      <button type="button" className="btn" onClick={onCancel}>
        {t.acceso.cancel}
      </button>
    </div>
  );
}
