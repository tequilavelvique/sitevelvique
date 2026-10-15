import { identityErrorResponse, ownedWallet, verifyUser } from "@/lib/server/cdp";
import { boundWallet, memberTier, membershipConfigured } from "@/lib/server/members";
import { env } from "@/lib/env";

/**
 * Who is this, and are they in? Verifies the Coinbase session server-side and reads membership from the chain.
 * Returns linked socials (type + public username only), the wallet that should hold the membership, and its tier.
 */
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await verifyUser(req);
    const body = (await req.json().catch(() => ({}))) as { address?: string };
    const address = body.address ? ownedWallet(user, body.address) : (user.smartAccount ?? user.wallets[0] ?? null);
    const [tier, bound] = await Promise.all([address ? memberTier(address) : 0, boundWallet(user.identity)]);

    return Response.json(
      {
        address,
        tier,
        boundWallet: bound,
        socials: user.socials.map((s) => ({ type: s.type, username: s.username ?? null })),
        wallets: user.wallets,
        needsSocial: process.env.MEMBERSHIP_REQUIRE_SOCIAL !== "0" && user.socials.length === 0,
        inviteOnly: env.membershipInviteOnly,
        configured: membershipConfigured(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return identityErrorResponse(e);
  }
}
