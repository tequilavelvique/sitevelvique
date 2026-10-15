import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchJson } from "@velvique/vault/lens";
import { ArticleDoc, published } from "@velvique/vault/cms";
import { GROVE_TAG, REVALIDATE, isSeed, loadManifest, seedBody } from "@/lib/content";
import { ArticleView } from "@/components/journal/ArticleView";

export const revalidate = 60;

async function find(slug: string) {
  const manifest = await loadManifest();
  return published(manifest.articles).find((a) => a.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const entry = await find((await params).slug);
  return entry ? { title: entry.title.ES, description: entry.excerpt.ES } : { title: "Diario" };
}

/** `/diario/[slug]`: public bodies render from Grove; members bodies stay sealed until the member gate opens them. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await find((await params).slug);
  if (!entry) notFound();

  let body: { ES: string; EN: string } | null = null;
  if (isSeed(entry.uri)) {
    body = seedBody(entry.slug);
  } else if (entry.access === "public") {
    try {
      const doc = ArticleDoc.parse(await fetchJson(entry.uri, { next: { revalidate: REVALIDATE, tags: [GROVE_TAG] } }));
      body = "ct" in doc.body ? null : doc.body;
    } catch {
      body = null;
    }
  }

  return <ArticleView entry={entry} body={body} />;
}
