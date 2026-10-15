"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { Address } from "viem";
import { removeResource } from "@velvique/vault";
import { addArchive, newId, removeArchive, updateArchive, type ArchivePhoto, type SiteManifest } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { adminSigner, mutateManifest, uploadImage } from "@/lib/admin";
import { mediaUrl } from "@/lib/media";
import { Status } from "./fields";

/** El After flash archive: drop photos, they land on Grove and appear in the Masonry on /el-after. */
export function ArchiveAdmin({ admin, manifest, onSaved }: { admin: Address; manifest: SiteManifest; onSaved: (m: SiteManifest) => void }) {
  const { t } = useSite();
  const a = t.admin;
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState("idle");

  const add = async (files: FileList) => {
    setState("saving");
    try {
      const photos: ArchivePhoto[] = [];
      for (const f of Array.from(files)) {
        const { uri, w, h } = await uploadImage(admin, f);
        photos.push({ id: newId(), uri, w, h });
      }
      onSaved(await mutateManifest(admin, (m) => photos.reduce(addArchive, m)));
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  const patch = async (p: ArchivePhoto) => {
    setState("saving");
    try {
      onSaved(await mutateManifest(admin, (m) => updateArchive(m, p)));
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  const del = async (p: ArchivePhoto) => {
    setState("saving");
    try {
      onSaved(await mutateManifest(admin, (m) => removeArchive(m, p.id)));
      await removeResource(p.uri, await adminSigner()).catch(() => false);
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Status state={state} labels={{ saving: a.saving, saved: a.saved, error: a.error }} />
      <button type="button" className="btn btn--led" style={{ alignSelf: "flex-start" }} onClick={() => input.current?.click()} disabled={state === "saving"}>
        {a.upload}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && add(e.target.files)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 18 }}>
        {manifest.archive.map((p) => (
          <ArchiveCard key={p.id} p={p} onSave={patch} onDelete={del} labels={{ time: a.f_time, meme: a.f_meme, save: a.save, del: a.delete }} />
        ))}
      </div>
    </div>
  );
}

function ArchiveCard({ p, onSave, onDelete, labels }: { p: ArchivePhoto; onSave: (p: ArchivePhoto) => void; onDelete: (p: ArchivePhoto) => void; labels: Record<"time" | "meme" | "save" | "del", string> }) {
  const [time, setTime] = useState(p.time ?? "");
  const [m1, setM1] = useState(p.meme?.[0] ?? "");
  const [m2, setM2] = useState(p.meme?.[1] ?? "");
  const src = mediaUrl(p.uri);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ position: "relative", aspectRatio: `${p.w}/${p.h}`, background: "var(--ink-raised)" }}>
        {src ? <Image src={src} alt="" fill sizes="220px" style={{ objectFit: "cover" }} /> : null}
      </div>
      <label className="field eyebrow">
        {labels.time}
        <input value={time} placeholder="3:15 AM" onChange={(e) => setTime(e.target.value)} />
      </label>
      <label className="field eyebrow">
        {labels.meme}
        <input value={m1} placeholder="Ella: solo una" onChange={(e) => setM1(e.target.value)} />
        <input value={m2} placeholder="Velvique: ya son las 4" onChange={(e) => setM2(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="eyebrow hit"
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--bone)" }}
          onClick={() => onSave({ ...p, time: time || undefined, meme: m1 && m2 ? [m1, m2] : undefined })}
        >
          {labels.save}
        </button>
        <button type="button" className="eyebrow hit" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => onDelete(p)}>
          {labels.del}
        </button>
      </div>
    </div>
  );
}
