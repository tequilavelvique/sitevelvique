"use client";

import { useState } from "react";
import type { Address } from "viem";
import { publishJson, readFresh, removeResource, replaceJson, sealJson } from "@velvique/vault";
import { EventDoc, newId, removeEvent, slugify, upsertEvent, type Access, type EventEntry, type Localized, type SiteManifest } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useMembers } from "@/components/providers/MembersProvider";
import { MEMBERS_RECIPIENT, acl, adminSigner, mutateManifest, uploadImage } from "@/lib/admin";
import { env } from "@/lib/env";
import { eventStamp } from "@/lib/format";
import { ImageField, LocalizedField, Row, Select, Status, TextField } from "./fields";

type Draft = {
  id: string | null;
  uri: string | null;
  slug: string;
  title: Localized;
  summary: Localized;
  body: Localized;
  startsAt: string; // datetime-local value
  city: string;
  venue: string;
  access: Access;
  status: "draft" | "published";
  cover: string | null;
  coverFile: File | null;
  privateBody: Localized;
  privateAddress: string;
};

const blank = (): Draft => ({
  id: null,
  uri: null,
  slug: "",
  title: { ES: "", EN: "" },
  summary: { ES: "", EN: "" },
  body: { ES: "", EN: "" },
  startsAt: "",
  city: "",
  venue: "",
  access: "members",
  status: "draft",
  cover: null,
  coverFile: null,
  privateBody: { ES: "", EN: "" },
  privateAddress: "",
});

/** datetime-local has no zone: keep the admin's local offset so "10:00 PM" means 10 PM where the party is. */
function withOffset(local: string): string {
  const d = new Date(local);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${local.length === 16 ? `${local}:00` : local}${sign}${hh}:${mm}`;
}
const toLocalInput = (iso: string) => iso.slice(0, 16);

export function EventsAdmin({ admin, manifest, onSaved }: { admin: Address; manifest: SiteManifest; onSaved: (m: SiteManifest) => void }) {
  const { t, lang } = useSite();
  const a = t.admin;
  const { open } = useMembers();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState("idle");
  const [confirm, setConfirm] = useState<string | null>(null);

  const edit = async (e: EventEntry) => {
    setState("idle");
    let body: Localized = { ES: "", EN: "" };
    let priv = { ES: "", EN: "", address: "" };
    try {
      const doc = EventDoc.parse(await readFresh(e.uri));
      body = doc.body;
      if (doc.private) {
        const p = (await open<{ private: { ES: string; EN: string; address?: string } | null }>("event", e.id)).private;
        if (p) priv = { ES: p.ES, EN: p.EN, address: p.address ?? "" };
      }
    } catch (err) {
      setState((err as Error).message);
    }
    setDraft({
      ...e,
      uri: e.uri,
      body,
      startsAt: toLocalInput(e.startsAt),
      coverFile: null,
      privateBody: { ES: priv.ES, EN: priv.EN },
      privateAddress: priv.address,
    });
  };

  const save = async () => {
    if (!draft) return;
    const hasPrivate = Boolean(draft.privateBody.ES || draft.privateBody.EN || draft.privateAddress);
    if (hasPrivate && !env.membersPubKey) {
      setState(a.missing_key);
      return;
    }
    setState("saving");
    try {
      const id = draft.id ?? newId();
      const slug = slugify(draft.slug || draft.title.ES || draft.title.EN) || id;
      const cover = draft.coverFile ? (await uploadImage(admin, draft.coverFile)).uri : draft.cover;
      const priv = hasPrivate
        ? await sealJson({ ...draft.privateBody, address: draft.privateAddress || undefined }, MEMBERS_RECIPIENT, env.membersPubKey!)
        : null;
      const entry = {
        id,
        slug,
        title: draft.title,
        summary: draft.summary,
        startsAt: withOffset(draft.startsAt),
        city: draft.city,
        venue: draft.venue,
        cover,
        access: draft.access,
        status: draft.status,
      };
      const doc: EventDoc = { v: 1, ...entry, body: draft.body, private: priv, updatedAt: new Date().toISOString() };
      const uri = draft.uri ? (await replaceJson(draft.uri, doc, await adminSigner(), acl(admin))).uri : (await publishJson(doc, acl(admin), `${slug}.json`)).uri;
      onSaved(await mutateManifest(admin, (m) => upsertEvent(m, { ...entry, uri })));
      setDraft(null);
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  const del = async (e: EventEntry) => {
    setState("saving");
    try {
      onSaved(await mutateManifest(admin, (m) => removeEvent(m, e.id)));
      await removeResource(e.uri, await adminSigner()).catch(() => false);
      setConfirm(null);
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  const labels = { upload: a.upload, replace: a.replace, clear: a.clear };

  if (draft) {
    return (
      <div className="stack" style={{ gap: 26 }}>
        <LocalizedField label={a.f_title} value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
        <Row>
          <TextField label={a.f_slug} value={draft.slug} placeholder={slugify(draft.title.ES)} onChange={(slug) => setDraft({ ...draft, slug })} />
          <TextField label={a.f_starts} type="datetime-local" value={draft.startsAt} onChange={(startsAt) => setDraft({ ...draft, startsAt })} />
          <TextField label={a.f_city} value={draft.city} onChange={(city) => setDraft({ ...draft, city })} />
          <TextField label={a.f_venue} value={draft.venue} onChange={(venue) => setDraft({ ...draft, venue })} />
        </Row>
        <Row>
          <Select label={a.f_access} value={draft.access} options={[{ value: "public", label: a.access_public }, { value: "members", label: a.access_members }]} onChange={(access) => setDraft({ ...draft, access })} />
          <Select label={a.f_status} value={draft.status} options={[{ value: "draft", label: a.status_draft }, { value: "published", label: a.status_published }]} onChange={(status) => setDraft({ ...draft, status })} />
        </Row>
        <LocalizedField label={a.f_summary} value={draft.summary} onChange={(summary) => setDraft({ ...draft, summary })} multiline rows={3} />
        <ImageField label={a.f_cover} ratio="4/5" uri={draft.cover} file={draft.coverFile} labels={labels} onFile={(f) => setDraft({ ...draft, coverFile: f })} onClear={() => setDraft({ ...draft, cover: null, coverFile: null })} />
        <LocalizedField label={a.f_body} value={draft.body} onChange={(body) => setDraft({ ...draft, body })} multiline rows={8} />
        <div className="card stack" style={{ gap: 18 }}>
          <span className="badge badge--members" style={{ alignSelf: "flex-start" }}>
            {a.access_members}
          </span>
          <TextField label={a.f_private_address} value={draft.privateAddress} onChange={(privateAddress) => setDraft({ ...draft, privateAddress })} />
          <LocalizedField label={a.f_private} value={draft.privateBody} onChange={(privateBody) => setDraft({ ...draft, privateBody })} multiline rows={6} />
        </div>
        <Status state={state} labels={{ saving: a.saving, saved: a.saved, error: a.error }} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--led" onClick={save} disabled={state === "saving" || !draft.startsAt || !(draft.title.ES || draft.title.EN)}>
            {a.save}
          </button>
          <button type="button" className="btn" onClick={() => setDraft(null)} disabled={state === "saving"}>
            {a.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <Status state={state} labels={{ saving: a.saving, saved: a.saved, error: a.error }} />
      <button type="button" className="btn btn--led" style={{ alignSelf: "flex-start" }} onClick={() => setDraft(blank())}>
        {a.new}
      </button>
      {manifest.events.map((e) => (
        <div key={e.id} className="hairline-top" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, paddingTop: 14, alignItems: "center" }}>
          <div className="stack" style={{ gap: 4 }}>
            <span style={{ fontSize: 20 }}>{e.title[lang] || e.title.ES}</span>
            <span className="eyebrow">
              {eventStamp(e.startsAt, lang)} · {e.city} · {e.status === "draft" ? a.status_draft : a.status_published} · {e.access === "members" ? a.access_members : a.access_public}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="eyebrow hit" style={{ background: "none", border: 0, cursor: "pointer", color: "var(--bone)" }} onClick={() => edit(e)}>
              {a.edit}
            </button>
            <button type="button" className="eyebrow hit" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => (confirm === e.id ? del(e) : setConfirm(e.id))}>
              {confirm === e.id ? a.confirm_delete : a.delete}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
