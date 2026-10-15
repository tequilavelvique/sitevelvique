import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchJson } from "@velvique/vault/lens";
import { EventDoc, published } from "@velvique/vault/cms";
import { GROVE_TAG, REVALIDATE, loadManifest } from "@/lib/content";
import { EventView } from "@/components/events/EventView";

export const revalidate = 60;

async function find(slug: string) {
  const manifest = await loadManifest();
  return published(manifest.events).find((e) => e.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const entry = await find((await params).slug);
  return entry ? { title: entry.title.ES, description: entry.summary.ES } : { title: "Eventos" };
}

/** `/eventos/[slug]`: public description from Grove; exact address and door time sealed for members. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await find((await params).slug);
  if (!entry) notFound();

  let body: { ES: string; EN: string } | null = null;
  let hasPrivate = false;
  try {
    const doc = EventDoc.parse(await fetchJson(entry.uri, { next: { revalidate: REVALIDATE, tags: [GROVE_TAG] } }));
    body = doc.body;
    hasPrivate = doc.private !== null;
  } catch {
    /* manifest entry still renders */
  }

  return <EventView entry={entry} body={body} hasPrivate={hasPrivate} />;
}
