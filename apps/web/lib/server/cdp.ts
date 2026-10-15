import "server-only";
import { CdpClient } from "@coinbase/cdp-sdk";
import { getAddress, isAddress, keccak256, toBytes, type Address, type Hex } from "viem";

/**
 * Coinbase (CDP) end-user identity, verified server-side. The browser sends the CDP access token;
 * `validateAccessToken` returns the end user with every linked auth method (Google, Apple, X, SIWE wallets)
 * and their accounts (CDP smart accounts and EOAs). That proves both "linked socials" and "owns this wallet"
 * without a database or an auth vendor of our own.
 */
let client: CdpClient | null = null;
function cdp(): CdpClient {
  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) throw new Error("CDP_API_KEY_ID / CDP_API_KEY_SECRET missing");
  client ??= new CdpClient({ apiKeyId: process.env.CDP_API_KEY_ID, apiKeySecret: process.env.CDP_API_KEY_SECRET });
  return client;
}

export const SOCIAL_TYPES = ["google", "apple", "x", "telegram", "github"] as const;
export type Social = { type: string; username?: string; name?: string };

export type VerifiedUser = {
  userId: string;
  /** Salted keccak of the CDP userId: what goes onchain, so CDP ids are not public. */
  identity: Hex;
  socials: Social[];
  /** Every wallet this user provably controls: CDP smart accounts, CDP EOAs, SIWE-linked wallets. */
  wallets: Address[];
  smartAccount: Address | null;
};

export class IdentityError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function identityOf(userId: string): Hex {
  const salt = process.env.MEMBERS_SALT;
  if (!salt) throw new Error("MEMBERS_SALT missing");
  return keccak256(toBytes(`${salt}:cdp:${userId}`));
}

type Method = { type: string; address?: string; username?: string; name?: string };

export async function verifyUser(req: Request): Promise<VerifiedUser> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new IdentityError(401, "no_token");

  let user: Awaited<ReturnType<CdpClient["endUser"]["validateAccessToken"]>>;
  try {
    user = await cdp().endUser.validateAccessToken({ accessToken: token });
  } catch {
    throw new IdentityError(401, "invalid_token");
  }

  const methods = (user.authenticationMethods ?? []) as Method[];
  const socials = methods
    .filter((m) => (SOCIAL_TYPES as readonly string[]).includes(m.type))
    .map((m) => ({ type: m.type, username: m.username, name: m.name }));

  const raw = [
    ...(user.evmSmartAccountObjects ?? []).map((a) => a.address),
    ...(user.evmAccountObjects ?? []).map((a) => (a as { address: string }).address),
    ...methods.filter((m) => m.type === "siwe" && m.address).map((m) => m.address!),
  ];
  const wallets = [...new Set(raw.filter((a) => isAddress(a)).map((a) => getAddress(a)))];
  const smart = user.evmSmartAccountObjects?.[0]?.address;

  return {
    userId: user.userId,
    identity: identityOf(user.userId),
    socials,
    wallets,
    smartAccount: smart && isAddress(smart) ? getAddress(smart) : null,
  };
}

/** The wallet a request acts for must belong to the verified user. */
export function ownedWallet(user: VerifiedUser, requested: unknown): Address {
  if (typeof requested !== "string" || !isAddress(requested)) throw new IdentityError(400, "bad_address");
  const a = getAddress(requested);
  if (!user.wallets.includes(a)) throw new IdentityError(403, "wallet_not_linked");
  return a;
}

export function identityErrorResponse(e: unknown): Response {
  if (e instanceof IdentityError) return Response.json({ error: e.message }, { status: e.status });
  console.error("[members]", (e as Error).message);
  return Response.json({ error: "server_error" }, { status: 500 });
}
