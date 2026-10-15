"use client";

import { useState } from "react";
import type { Address } from "viem";
import { publishJson, readFresh, removeResource, replaceJson, sealJson } from "@velvique/vault";
import { DIARIO_SEED } from "@velvique/content";
import { ArticleDoc, newId, readingMinutes, removeArticle, slugify, upsertArticle, type Access, type ArticleEntry, type ArticleKind, type Localized, type SiteManifest } from "@velvique/vault/cms";
import { useSite } from "@/components/providers/SiteProvider";
import { useMembers } from "@/components/providers/MembersProvider";
import { MEMBERS_RECIPIENT, acl, adminSigner, mutateManifest, uploadImage } from "@/lib/admin";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { ImageField, LocalizedField, Row, Select, Status, TextField } from "./fields";

type Draft = {
  id: string | null;
  uri: string | null;
  slug: string;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  tags: string;
  access: Access;
  status: "draft" | "published";
  publishedAt: string;
  cover: string | null;
  coverFile: File | null;
  kind: ArticleKind;
  author: string;
};

const blank = (): Draft => ({
  id: null,
  uri: null,
  slug: "",
  title: { ES: "", EN: "" },
  excerpt: { ES: "", EN: "" },
  body: { ES: "", EN: "" },
  tags: "",
  access: "public",
  status: "draft",
  publishedAt: new Date().toISOString().slice(0, 10),
  cover: null,
  coverFile: null,
  kind: "nota",
  author: "Redacción Velvique",
});

export function ArticlesAdmin({ admin, manifest, onSaved }: { admin: Address; manifest: SiteManifest; onSaved: (m: SiteManifest) => void }) {
  const { t, lang } = useSite();
  const a = t.admin;
  const { open } = useMembers();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState("idle");
  const [confirm, setConfirm] = useState<string | null>(null);

  const edit = async (e: ArticleEntry) => {
    setState("idle");
    let body: Localized = { ES: "", EN: "" };
    try {
      const doc = ArticleDoc.parse(await readFresh(e.uri));
      body = "ct" in doc.body ? (await open<{ body: Localized }>("article", e.id)).body : doc.body;
    } catch (err) {
      setState((err as Error).message);
    }
    setDraft({ ...e, uri: e.uri, body, tags: e.tags.join(", "), publishedAt: e.publishedAt.slice(0, 10), coverFile: null, kind: e.kind ?? "nota", author: e.author ?? "" });
  };

  const save = async () => {
    if (!draft) return;
    if (draft.access === "members" && !env.membersPubKey) {
      setState(a.missing_key);
      return;
    }
    setState("saving");
    try {
      const id = draft.id ?? newId();
      const slug = slugify(draft.slug || draft.title.ES || draft.title.EN) || id;
      const cover = draft.coverFile ? (await uploadImage(admin, draft.coverFile)).uri : draft.cover;
      const body = draft.access === "members" ? await sealJson(draft.body, MEMBERS_RECIPIENT, env.membersPubKey!) : draft.body;
      const entry = {
        id,
        slug,
        title: draft.title,
        excerpt: draft.excerpt,
        cover,
        tags: draft.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        access: draft.access,
        status: draft.status,
        publishedAt: new Date(draft.publishedAt).toISOString(),
        kind: draft.kind,
        ...(draft.author.trim() ? { author: draft.author.trim() } : {}),
        minutes: readingMinutes(draft.body.ES || draft.body.EN),
      };
      const doc: ArticleDoc = { v: 1, ...entry, body, updatedAt: new Date().toISOString() };
      const uri = draft.uri ? (await replaceJson(draft.uri, doc, await adminSigner(), acl(admin))).uri : (await publishJson(doc, acl(admin), `${slug}.json`)).uri;
      onSaved(await mutateManifest(admin, (m) => upsertArticle(m, { ...entry, uri })));
      setDraft(null);
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  const del = async (e: ArticleEntry) => {
    setState("saving");
    try {
      onSaved(await mutateManifest(admin, (m) => removeArticle(m, e.id)));
      await removeResource(e.uri, await adminSigner()).catch(() => false);
      setConfirm(null);
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  // The repo's starter articles, published to Grove in one pass: each doc uploads under the admin ACL,
  // then a single manifest write lists them all (one wallet signature for the whole set).
  const unpublishedSeed = DIARIO_SEED.filter((s) => !manifest.articles.some((e) => e.id === s.id || e.slug === s.slug));
  const publishSeed = async () => {
    setState("saving");
    try {
      const entries: ArticleEntry[] = [];
      for (const { body, ...s } of unpublishedSeed) {
        const entry = { ...s, minutes: readingMinutes(body.ES) };
        const doc: ArticleDoc = { v: 1, ...entry, body, updatedAt: new Date().toISOString() };
        const { uri } = await publishJson(doc, acl(admin), `${s.slug}.json`);
        entries.push({ ...entry, uri });
      }
      onSaved(await mutateManifest(admin, (m) => entries.reduce(upsertArticle, m)));
      setState("saved");
    } catch (err) {
      setState((err as Error).message);
    }
  };

  const labels = { upload: a.upload, replace: a.replace, clear: a.clear };
  const kindOptions = (Object.keys(t.diario.kinds) as ArticleKind[]).map((value) => ({ value, label: t.diario.kinds[value] }));

  if (draft) {
    return (
      <div className="stack" style={{ gap: 26 }}>
        <LocalizedField label={a.f_title} value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
        <Row>
          <TextField label={a.f_slug} value={draft.slug} placeholder={slugify(draft.title.ES)} onChange={(slug) => setDraft({ ...draft, slug })} />
          <TextField label={a.f_date} type="date" value={draft.publishedAt} onChange={(publishedAt) => setDraft({ ...draft, publishedAt })} />
          <Select label={a.f_access} value={draft.access} options={[{ value: "public", label: a.access_public }, { value: "members", label: a.access_members }]} onChange={(access) => setDraft({ ...draft, access })} />
          <Select label={a.f_status} value={draft.status} options={[{ value: "draft", label: a.status_draft }, { value: "published", label: a.status_published }]} onChange={(status) => setDraft({ ...draft, status })} />
        </Row>
        <Row>
          <Select label={a.f_kind} value={draft.kind} options={kindOptions} onChange={(kind) => setDraft({ ...draft, kind })} />
          <TextField label={a.f_author} value={draft.author} onChange={(author) => setDraft({ ...draft, author })} />
        </Row>
        <TextField label={a.f_tags} value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} />
        <LocalizedField label={a.f_excerpt} value={draft.excerpt} onChange={(excerpt) => setDraft({ ...draft, excerpt })} multiline rows={3} />
        <ImageField label={a.f_cover} uri={draft.cover} file={draft.coverFile} labels={labels} onFile={(f) => setDraft({ ...draft, coverFile: f })} onClear={() => setDraft({ ...draft, cover: null, coverFile: null })} />
        <LocalizedField label={a.f_body} value={draft.body} onChange={(body) => setDraft({ ...draft, body })} multiline rows={16} />
        <Status state={state} labels={{ saving: a.saving, saved: a.saved, error: a.error }} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--led" onClick={save} disabled={state === "saving" || !(draft.title.ES || draft.title.EN)}>
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
      {unpublishedSeed.length ? (
        <div className="hairline-gold stack" style={{ gap: 10, paddingTop: 16 }}>
          <span style={{ fontSize: 20 }}>
            {a.seed_t} · {unpublishedSeed.length}
          </span>
          <p className="lede" style={{ fontSize: 15, margin: 0 }}>
            {a.seed_p}
          </p>
          <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={publishSeed} disabled={state === "saving"}>
            {a.seed_publish}
          </button>
        </div>
      ) : null}
      {manifest.articles.map((e) => (
        <div key={e.id} className="hairline-top" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, paddingTop: 14, alignItems: "center" }}>
          <div className="stack" style={{ gap: 4 }}>
            <span style={{ fontSize: 20 }}>{e.title[lang] || e.title.ES}</span>
            <span className="eyebrow">
              {formatDate(e.publishedAt, lang)} · {e.status === "draft" ? a.status_draft : a.status_published} · {e.access === "members" ? a.access_members : a.access_public}
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
