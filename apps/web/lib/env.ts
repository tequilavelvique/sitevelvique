import { type Address, getAddress, isAddress } from "viem";

/** Public env. NEXT_PUBLIC_* must be referenced literally so Next inlines them. */
const addr = (v: string | undefined): Address | null => (v && isAddress(v) ? getAddress(v) : null);
const hex = (v: string | undefined): `0x${string}` | null => (v && /^0x[0-9a-fA-F]+$/.test(v) ? (v as `0x${string}`) : null);

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532) === 8453 ? 8453 : 84532;

export const env = {
  chainId: chainId as 8453 | 84532,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || (chainId === 8453 ? "https://mainnet.base.org" : "https://sepolia.base.org"),
  reownProjectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || null,

  access: addr(process.env.NEXT_PUBLIC_ACCESS_ADDRESS),
  catalog: addr(process.env.NEXT_PUBLIC_CATALOG_ADDRESS),
  orders: addr(process.env.NEXT_PUBLIC_ORDERS_ADDRESS),
  provenance: addr(process.env.NEXT_PUBLIC_PROVENANCE_ADDRESS),
  deployBlock: BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || 0),

  fulfiller: addr(process.env.NEXT_PUBLIC_FULFILLER_ADDRESS),
  fulfillmentPubKey: hex(process.env.NEXT_PUBLIC_FULFILLMENT_PUBKEY),
  groveGenericAcl: process.env.NEXT_PUBLIC_GROVE_GENERIC_ACL === "1",

  bottleUsdz: process.env.NEXT_PUBLIC_BOTTLE_USDZ || null,
  bottleLoop: process.env.NEXT_PUBLIC_BOTTLE_LOOP || null,

  /** Grove CMS: the site manifest (one mutable JSON, stable lens:// URI). */
  groveSiteUri: process.env.NEXT_PUBLIC_GROVE_SITE_URI || null,
  /** Wallets allowed into /admin. UI gate only; Grove ACLs and server signature checks are the real gate. */
  admins: (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || "")
    .split(",")
    .map((a) => addr(a.trim()))
    .filter((a): a is Address => a !== null),
  /** Raw P-256 public key the admin seals members-only content to; the server holds the private half. */
  membersPubKey: hex(process.env.NEXT_PUBLIC_MEMBERS_PUBKEY),

  /** Coinbase CDP project: social sign-in (Google, Apple, X) creates a Coinbase smart wallet. */
  cdpProjectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || null,
  /** When on, a membership also needs a VQ invitation code (burned onchain as the invite nonce). */
  membershipInviteOnly: process.env.NEXT_PUBLIC_MEMBERSHIP_INVITE_ONLY === "1",

  railSwap: process.env.NEXT_PUBLIC_RAIL_SWAP !== "0",
  railCardUs: process.env.NEXT_PUBLIC_RAIL_CARD_US === "1",
} as const;

export const explorer = env.chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";
