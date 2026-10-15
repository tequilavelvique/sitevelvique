"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Localized } from "@velvique/vault/cms";
import { mediaUrl } from "@/lib/media";

/** Admin form primitives: bilingual fields side by side, file picker with Grove preview. */
export function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
}: {
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
      <legend className="eyebrow" style={{ paddingBottom: 6 }}>
        {label}
      </legend>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 18 }}>
        {(["ES", "EN"] as const).map((l) => (
          <label key={l} className="field eyebrow">
            {l}
            {multiline ? (
              <textarea rows={rows} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} style={{ minHeight: rows * 28, fontSize: 17, letterSpacing: 0 }} />
            ) : (
              <input value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TextField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="field eyebrow">
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="field eyebrow">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Shows the current Grove image (or the newly picked file) and lets the admin pick/replace/clear. */
export function ImageField({
  label,
  uri,
  file,
  onFile,
  onClear,
  labels,
  ratio = "4/3",
}: {
  label: string;
  uri: string | null;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  labels: { upload: string; replace: string; clear: string };
  ratio?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const blobUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => (blobUrl ? () => URL.revokeObjectURL(blobUrl) : undefined), [blobUrl]);
  const preview = blobUrl ?? mediaUrl(uri);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <span className="eyebrow">{label}</span>
      <div style={{ position: "relative", aspectRatio: ratio, maxWidth: 360, background: "var(--ink-raised)", border: "1px solid var(--hairline)" }}>
        {preview ? <Image src={preview} alt="" fill unoptimized sizes="360px" style={{ objectFit: "cover" }} /> : null}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn" style={{ minHeight: 44, padding: "0 18px" }} onClick={() => input.current?.click()}>
          {preview ? labels.replace : labels.upload}
        </button>
        {preview ? (
          <button type="button" className="btn" style={{ minHeight: 44, padding: "0 18px" }} onClick={onClear}>
            {labels.clear}
          </button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/*,video/mp4" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 18 }}>{children}</div>;
}

export function Status({ state, labels }: { state: "idle" | "saving" | "saved" | string; labels: { saving: string; saved: string; error: string } }) {
  if (state === "idle") return null;
  return (
    <p role="status" className="caption-i" style={{ margin: 0 }}>
      {state === "saving" ? labels.saving : state === "saved" ? labels.saved : `${labels.error}: ${state}`}
    </p>
  );
}
