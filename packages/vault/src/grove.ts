import {
  StorageClient,
  genericAcl,
  immutable,
  walletOnly,
  RECOVERED_ADDRESS_PARAM_MARKER,
  type AclConfig,
  type Signer,
} from "@lens-chain/storage-client";
import type { Envelope, Hex } from "./envelope";
import { resolveLens } from "./lens";

/**
 * Grove is the only storage layer. API per @lens-chain/storage-client 1.0.6:
 *  - uploadAsJson / uploadFile(file, { acl })  -> FileUploadResponse (uri, gatewayUrl, waitForPropagation())
 *  - updateJson(uri, json, signer, { acl })    -> same lens:// URI, new content
 *  - delete(uri, signer)                       -> { success }
 * Every upload must declare an ACL. Edits/deletes are only allowed after propagation and are authorized by a
 * signature from the ACL's wallet (viem WalletClient / LocalAccount satisfy `Signer`).
 * Everything on Grove is world-readable: private data goes in sealed envelopes.
 * Limits: 125 MB per upload. Supported ACL chains include Base (8453) and Base Sepolia (84532).
 */
export type ChainId = 8453 | 84532;
export type { AclConfig, Signer };

let client: StorageClient | null = null;
export function grove(): StorageClient {
  client ??= StorageClient.create();
  return client;
}

// ------------------------------------------------------------------ ACL builders

/** Brand content (site manifest, articles, events, media): editable by the admin wallet. */
export const adminAcl = (admin: Hex, chainId: ChainId) => walletOnly(admin, chainId);

/** Cache-forever assets (bottle GLB/USDZ, posters). */
export const immutableAcl = (chainId: ChainId) => immutable(chainId);

/** Shipping envelopes when contracts are live: any FULFILLER_ROLE holder on VelviqueOrders may edit/delete. */
export const shippingAclGeneric = (orders: Hex, chainId: ChainId) =>
  genericAcl(chainId)
    .withContractAddress(orders)
    .withFunctionSig("isFulfiller(address)")
    .withParams([RECOVERED_ADDRESS_PARAM_MARKER])
    .build();
export const shippingAclWallet = (fulfiller: Hex, chainId: ChainId) => walletOnly(fulfiller, chainId);

/** Wholesale inquiries: the fulfillment wallet only. */
export const inquiryAcl = (fulfiller: Hex, chainId: ChainId) => walletOnly(fulfiller, chainId);

/** Kept for callers that infer the ACL type from the client signature. */
export type Acl = AclConfig;

// ------------------------------------------------------------------ write

export type Uploaded = { uri: string; gatewayUrl: string };

/** Upload JSON and wait until it is editable (propagated). */
export async function publishJson(data: unknown, acl: AclConfig, name = "data.json"): Promise<Uploaded> {
  const res = await grove().uploadAsJson(data, { acl, name });
  await res.waitForPropagation();
  return { uri: res.uri, gatewayUrl: res.gatewayUrl };
}

/** Replace a mutable JSON in place. Same lens:// URI afterwards. Pass the same ACL to keep permissions. */
export async function replaceJson(uri: string, data: unknown, signer: Signer, acl: AclConfig): Promise<Uploaded> {
  const res = await grove().updateJson(uri, data, signer, { acl });
  return { uri: res.uri, gatewayUrl: res.gatewayUrl };
}

/** Upload a media file (image/video). 125 MB max. */
export async function uploadMedia(file: File, acl: AclConfig): Promise<Uploaded> {
  if (file.size > 125 * 1024 * 1024) throw new Error("File exceeds Grove's 125 MB limit");
  const res = await grove().uploadFile(file, { acl });
  await res.waitForPropagation();
  return { uri: res.uri, gatewayUrl: res.gatewayUrl };
}

export async function removeResource(uri: string, signer: Signer): Promise<boolean> {
  const res = await grove().delete(uri, signer);
  return res.success;
}

/** Legacy helpers used by checkout / wholesale. */
export async function uploadJson(data: unknown, acl: AclConfig): Promise<Uploaded> {
  return publishJson(data, acl);
}
export async function uploadEnvelope(env: Envelope, acl: AclConfig): Promise<string> {
  return (await publishJson(env, acl, "envelope.json")).uri;
}
export const deleteBlob = removeResource;

// ------------------------------------------------------------------ read

/** Fresh read straight from the gateway (admin and server mutations: never from a cache). */
export async function readFresh<T>(uri: string): Promise<T> {
  const res = await fetch(`${resolveLens(uri)}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Grove ${res.status} for ${uri}`);
  return (await res.json()) as T;
}
