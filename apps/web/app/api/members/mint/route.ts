import { BaseError, ContractFunctionRevertedError } from "viem";
import { identityErrorResponse, ownedWallet, verifyUser } from "@/lib/server/cdp";
import { boundWallet, inviteNonce, memberTier, membershipConfigured, mintMembership } from "@/lib/server/members";
import { macFor, normalizeCode, parseCode, safeEqual } from "@/lib/invite-code";
import { env } from "@/lib/env";

/**
 * Starting a session = getting the membership. Rules, all checked here before the relayer mints:
 *  1. Valid Coinbase session (socials or SIWE wallet), verified with CDP server-side.
 *  2. At least one linked social (Google, Apple, X…), unless MEMBERSHIP_REQUIRE_SOCIAL=0.
 *  3. The receiving wallet belongs to that user (CDP smart account or SIWE-linked wallet).
 *  4. One membership per identity (enforced again onchain by `memberOfIdentity`).
 *  5. Invite-only drops: a valid VQ code, burned onchain as the invite nonce.
 */
export const runtime = "nodejs";

function revertName(e: unknown): string | null {
  if (!(e instanceof BaseError)) return null;
  const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
  return r instanceof ContractFunctionRevertedError ? (r.data?.errorName ?? null) : null;
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!membershipConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
    const user = await verifyUser(req);
    const body = (await req.json().catch(() => ({}))) as { address?: string; code?: string };
    const address = ownedWallet(user, body.address ?? user.smartAccount);

    if (process.env.MEMBERSHIP_REQUIRE_SOCIAL !== "0" && user.socials.length === 0) {
      return Response.json({ error: "needs_social" }, { status: 403 });
    }

    const bound = await boundWallet(user.identity);
    if (bound && bound !== address) return Response.json({ error: "identity_used", boundWallet: bound }, { status: 409 });
    if (bound === address && (await memberTier(address)) > 0) {
      return Response.json({ address, tier: await memberTier(address), already: true });
    }

    let nonce = null;
    if (env.membershipInviteOnly) {
      const secret = process.env.INVITE_CODE_SECRET;
      const code = normalizeCode(body.code ?? "");
      const parsed = parseCode(code);
      if (!secret || !parsed || !safeEqual(await macFor(parsed.body, secret), parsed.mac)) {
        return Response.json({ error: "bad_code" }, { status: 403 });
      }
      nonce = inviteNonce(code);
    }

    try {
      const { txHash } = await mintMembership(address, user.identity, nonce);
      return Response.json({ address, tier: await memberTier(address), txHash }, { headers: { "cache-control": "no-store" } });
    } catch (e) {
      const name = revertName(e);
      if (name === "IdentityUsed") return Response.json({ error: "identity_used" }, { status: 409 });
      if (name === "NonceUsed") return Response.json({ error: "used_code" }, { status: 409 });
      throw e;
    }
  } catch (e) {
    return identityErrorResponse(e);
  }
}
