import { createDevVault } from "./dev-vault";
import type { Envelope, Hex, Vault } from "./envelope";
import { hexToBytes } from "./envelope";

export * from "./envelope";
export * from "./grove";
export * from "./lens";
export { createDevVault, generateFulfillmentKeypair, importFulfillmentPrivateKey } from "./dev-vault";

/**
 * Single seam for the proprietary encryptor. Call `configureVault(myVault)` once at app start;
 * until then the WebCrypto staging vault is used.
 */
let active: Vault | null = null;
export function configureVault(v: Vault): void {
  active = v;
}
export function vaultFor(recipient: Hex): Vault {
  return active ?? createDevVault(recipient);
}

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
};

export type WholesaleInquiry = {
  venue: string;
  kind: string;
  city: string;
  volume: string;
  contact: string;
  note?: string;
  wallet: Hex;
  sentAt: string;
};

/** Seal any JSON payload to the fulfillment public key. The plain object never leaves this function. */
export async function sealJson(payload: unknown, recipient: Hex, recipientPubKeyHex: Hex): Promise<Envelope> {
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  return vaultFor(recipient).seal(plain, hexToBytes(recipientPubKeyHex));
}

export async function openJson<T>(env: Envelope, signer: unknown): Promise<T> {
  const bytes = await vaultFor(env.recipient).open(env, signer);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
