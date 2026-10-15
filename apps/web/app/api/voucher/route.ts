import { type Address, type Hex, isAddress, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { voucherDomain, voucherTypes } from "@velvique/contracts";
import { env } from "@/lib/env";
import { macFor, normalizeCode, parseCode, safeEqual } from "@/lib/invite-code";
import type { SignedVoucher } from "@/lib/voucher";

/**
 * Exchanges a typed invitation code for an EIP-712 voucher bound to the redeeming wallet.
 * Stateless: the code is self-authenticating (HMAC), and one-time use is the onchain nonce.
 * Nothing is written anywhere; the request body is not logged.
 */
export const runtime = "nodejs";

const TTL_SECONDS = 60 * 60;

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.INVITE_CODE_SECRET;
  const signerKey = process.env.VOUCHER_SIGNER_KEY as Hex | undefined;
  if (!secret || !signerKey || !env.access) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: { code?: unknown; to?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.code !== "string" || typeof body.to !== "string" || !isAddress(body.to)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const code = normalizeCode(body.code);
  const parsed = parseCode(code);
  if (!parsed || !safeEqual(await macFor(parsed.body, secret), parsed.mac)) {
    return Response.json({ error: "bad_code" }, { status: 403 });
  }

  const account = privateKeyToAccount(signerKey);
  const voucher = {
    to: body.to as Address,
    tier: parsed.tier,
    nonce: keccak256(toBytes(code)),
    deadline: BigInt(Math.floor(Date.now() / 1000) + TTL_SECONDS),
  };
  const sig = await account.signTypedData({
    domain: voucherDomain(env.chainId, env.access),
    types: voucherTypes,
    primaryType: "Voucher",
    message: voucher,
  });

  const out: SignedVoucher = { voucher: { ...voucher, deadline: voucher.deadline.toString() }, sig };
  return Response.json(out, { headers: { "cache-control": "no-store" } });
}
