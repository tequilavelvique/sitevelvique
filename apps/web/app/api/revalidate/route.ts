import { revalidatePath } from "next/cache";

/**
 * Called by /admin after every Grove save so the site refetches the manifest on the next request.
 * Unauthenticated on purpose: it only marks the cache stale (the data itself comes from Grove), and keeping it
 * open saves the admin one more signature per save.
 */
export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true, at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
