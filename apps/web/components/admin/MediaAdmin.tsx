"use client";

import { useState } from "react";
import type { Address } from "viem";
import { setMedia, type SiteManifest } from "@velvique/vault/cms";
import type { MediaSlot } from "@velvique/content";
import { useSite } from "@/components/providers/SiteProvider";
import { mutateManifest, uploadImage } from "@/lib/admin";
import { ImageField, Status } from "./fields";

/** The shot list as slots: replace any image on the site (hero, flash, dawn…) without a redeploy. */
export function MediaAdmin({ admin, manifest, onSaved }: { admin: Address; manifest: SiteManifest; onSaved: (m: SiteManifest) => void }) {
  const { t, lang, media } = useSite();
  const a = t.admin;
  const [state, setState] = useState("idle");

  const set = async (slot: MediaSlot, file: File | null) => {
    setState("saving");
    try {
      const uri = file ? (await uploadImage(admin, file)).uri : null;
      onSaved(await mutateManifest(admin, (m) => setMedia(m, slot, uri)));
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <Status state={state} labels={{ saving: a.saving, saved: a.saved, error: a.error }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 28 }}>
        {(Object.keys(media) as MediaSlot[]).filter((slot) => !media[slot].poster).map((slot) => (
          <ImageField
            key={slot}
            label={`${slot} · ${media[slot].placeholder[lang]}`}
            uri={manifest.media[slot] ?? null}
            file={null}
            labels={{ upload: a.upload, replace: a.replace, clear: a.clear }}
            onFile={(f) => set(slot, f)}
            onClear={() => set(slot, null)}
          />
        ))}
      </div>
    </div>
  );
}
