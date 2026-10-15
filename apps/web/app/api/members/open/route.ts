import { readFresh } from "@velvique/vault";
import { ArticleDoc, EventDoc, parseManifest, published } from "@velvique/vault/cms";
import { identityErrorResponse, ownedWallet, verifyUser } from "@/lib/server/cdp";
import { memberTier, openMembersEnvelope } from "@/lib/server/members";
import { env } from "@/lib/env";
import { loadManifest } from "@/lib/content";

/**
 * Opens members-only content for a verified member: Coinbase session valid, wallet belongs to the user,
 * and that wallet holds the onchain membership. Only manifest entries marked `members` can be opened,
 * so this is not a general decryption oracle. Admin wallets may also open drafts (they edit them).
 */
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await verifyUser(req);
    const { kind, id, address: requested } = (await req.json()) as { kind?: "article" | "event"; id?: string; address?: string };
    const address = ownedWallet(user, requested);
    if ((await memberTier(address)) < 1) return Response.json({ error: "not_member" }, { status: 403 });

    const isAdmin = env.admins.includes(address);
    const manifest = isAdmin && env.groveSiteUri ? (parseManifest(await readFresh(env.groveSiteUri)) ?? (await loadManifest())) : await loadManifest();
    const visible = <T extends { status: "draft" | "published" }>(list: T[]) => (isAdmin ? list : published(list));

    if (kind === "article") {
      const entry = visible(manifest.articles).find((a) => a.id === id && (a.access === "members" || isAdmin));
      if (!entry) return Response.json({ error: "not_found" }, { status: 404 });
      const doc = ArticleDoc.parse(await readFresh(entry.uri));
      if (!("ct" in doc.body)) return Response.json({ body: doc.body });
      const body = await openMembersEnvelope<{ ES: string; EN: string }>(doc.body);
      return Response.json({ body }, { headers: { "cache-control": "no-store" } });
    }
    if (kind === "event") {
      const entry = visible(manifest.events).find((e) => e.id === id);
      if (!entry) return Response.json({ error: "not_found" }, { status: 404 });
      const doc = EventDoc.parse(await readFresh(entry.uri));
      if (!doc.private) return Response.json({ private: null });
      const priv = await openMembersEnvelope<{ ES: string; EN: string; address?: string }>(doc.private);
      return Response.json({ private: priv }, { headers: { "cache-control": "no-store" } });
    }
    return Response.json({ error: "bad_request" }, { status: 400 });
  } catch (e) {
    return identityErrorResponse(e);
  }
}
