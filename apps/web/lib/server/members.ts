import "server-only";
import { createWalletClient, http, keccak256, parseEventLogs, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { accessAbi } from "@velvique/contracts";
import { importFulfillmentPrivateKey, openJson, type Envelope } from "@velvique/vault";
import { publicClient } from "@/lib/chain/server";
import { env } from "@/lib/env";

/**
 * Membership = holding a VelviqueAccess ERC-1155 (any tier). The chain is the members list; we control access by
 * minting (relayer, MINTER_ROLE only), granting/upgrading and revoking (admin wallet / Safe).
 */
export function membershipConfigured(): boolean {
  return Boolean(env.access && process.env.MEMBERSHIP_MINTER_KEY);
}

/** Highest tier held onchain. Admin wallets count as top tier so they can open the content they edit. */
export async function memberTier(address: Address): Promise<number> {
  if (env.admins.includes(address)) return 3;
  if (!env.access) return 0;
  return Number(await publicClient.readContract({ address: env.access, abi: accessAbi, functionName: "passOf", args: [address] }));
}

export async function boundWallet(identity: Hex): Promise<Address | null> {
  if (!env.access) return null;
  const a = await publicClient.readContract({ address: env.access, abi: accessAbi, functionName: "memberOfIdentity", args: [identity] });
  return a === "0x0000000000000000000000000000000000000000" ? null : a;
}

export const inviteNonce = (code: string): Hex => keccak256(toBytes(code));

function relayer() {
  const key = process.env.MEMBERSHIP_MINTER_KEY as Hex | undefined;
  if (!key) throw new Error("MEMBERSHIP_MINTER_KEY missing");
  return createWalletClient({
    account: privateKeyToAccount(key),
    chain: env.chainId === 8453 ? base : baseSepolia,
    transport: http(process.env.RPC_URL_SERVER || env.rpcUrl),
  });
}

/**
 * Mints the membership through the relayer (we pay gas; the member signs and funds nothing).
 * Simulates first so contract errors (IdentityUsed, NonceUsed) surface as clean codes.
 */
export async function mintMembership(to: Address, identity: Hex, nonce: Hex | null): Promise<{ txHash: Hex; minted: boolean }> {
  if (!env.access) throw new Error("NEXT_PUBLIC_ACCESS_ADDRESS missing");
  const wallet = relayer();
  const { request } = await publicClient.simulateContract({
    account: wallet.account,
    address: env.access,
    abi: accessAbi,
    functionName: "mintMembership",
    args: [to, identity, nonce ?? "0x0000000000000000000000000000000000000000000000000000000000000000"],
  });
  const txHash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("mint_reverted");
  const minted = parseEventLogs({ abi: accessAbi, eventName: "PassMinted", logs: receipt.logs }).length > 0;
  return { txHash, minted };
}

let membersKey: Promise<CryptoKey> | null = null;
/** Opens envelopes sealed by the admin to NEXT_PUBLIC_MEMBERS_PUBKEY. */
export async function openMembersEnvelope<T>(envelope: { v: 1; alg: string; recipient: string; ct: string; sha256: string }): Promise<T> {
  const pkcs8 = process.env.MEMBERS_PRIVATE_KEY_PKCS8;
  if (!pkcs8) throw new Error("MEMBERS_PRIVATE_KEY_PKCS8 missing");
  membersKey ??= importFulfillmentPrivateKey(pkcs8);
  return openJson<T>(envelope as Envelope, await membersKey);
}
