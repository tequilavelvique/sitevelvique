/**
 * Encryption envelope. Plug point for the proprietary encryptor (guide section 5).
 * The browser seals, Grove stores the JSON, the chain stores only the lens:// URI and `sha256`.
 */
export type Hex = `0x${string}`;

export type Envelope = {
  v: 1;
  alg: string; // set by the encryptor
  recipient: Hex; // fulfillment wallet that can decrypt
  ct: string; // base64 ciphertext
  sha256: Hex; // hash of ct, also stored onchain
};

export interface Vault {
  seal(plain: Uint8Array, recipientPubKey: Uint8Array): Promise<Envelope>;
  open(env: Envelope, signer: unknown): Promise<Uint8Array>;
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** sha256 over the UTF-8 bytes of the base64 ciphertext string. */
export async function sha256OfCt(ct: string): Promise<Hex> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ct));
  return bytesToHex(new Uint8Array(digest));
}

export function isEnvelope(x: unknown): x is Envelope {
  if (typeof x !== "object" || x === null) return false;
  const e = x as Record<string, unknown>;
  return e.v === 1 && typeof e.alg === "string" && typeof e.ct === "string" && typeof e.sha256 === "string" && typeof e.recipient === "string";
}

/** Fulfillment side: refuse an envelope whose ciphertext does not match the onchain hash. */
export async function assertIntegrity(env: Envelope, onchainHash: Hex): Promise<void> {
  const h = await sha256OfCt(env.ct);
  if (h.toLowerCase() !== env.sha256.toLowerCase() || h.toLowerCase() !== onchainHash.toLowerCase()) {
    throw new Error("Envelope hash mismatch");
  }
}
