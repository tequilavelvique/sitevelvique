import { type Envelope, type Hex, type Vault, fromBase64, sha256OfCt, toBase64 } from "./envelope";

/**
 * Staging encryptor: ECDH P-256 + HKDF + AES-256-GCM over WebCrypto.
 * Swap for the proprietary encryptor by passing another `Vault` to `configureVault`; the envelope shape stays.
 *
 * ct layout (before base64): ephemeralPublicKey(65, raw) || iv(12) || ciphertext+tag
 */
const ALG = "ecdh-p256-hkdf-aes256gcm/v1";
const subtle = () => globalThis.crypto.subtle;
/** WebCrypto's BufferSource rejects SharedArrayBuffer-backed views; our bytes are always plain ArrayBuffer. */
const bytes = (u: Uint8Array) => u as Uint8Array<ArrayBuffer>;

async function deriveKey(priv: CryptoKey, pub: CryptoKey, usage: KeyUsage): Promise<CryptoKey> {
  const bits = await subtle().deriveBits({ name: "ECDH", public: pub }, priv, 256);
  const hkdfKey = await subtle().importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode(ALG) },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export function createDevVault(recipient: Hex): Vault {
  return {
    async seal(plain, recipientPubKey): Promise<Envelope> {
      const recipientKey = await subtle().importKey("raw", bytes(recipientPubKey),{ name: "ECDH", namedCurve: "P-256" }, false, []);
      const eph = await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      const aes = await deriveKey(eph.privateKey, recipientKey, "encrypt");
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, aes, bytes(plain)));
      const ephRaw = new Uint8Array(await subtle().exportKey("raw", eph.publicKey));
      const packed = new Uint8Array(ephRaw.length + iv.length + ct.length);
      packed.set(ephRaw, 0);
      packed.set(iv, ephRaw.length);
      packed.set(ct, ephRaw.length + iv.length);
      const b64 = toBase64(packed);
      return { v: 1, alg: ALG, recipient, ct: b64, sha256: await sha256OfCt(b64) };
    },

    /** `signer` is the fulfillment ECDH private CryptoKey in staging. */
    async open(env, signer): Promise<Uint8Array> {
      if (env.alg !== ALG) throw new Error(`Unsupported alg ${env.alg}`);
      const priv = signer as CryptoKey;
      const packed = fromBase64(env.ct);
      const ephPub = await subtle().importKey("raw", packed.slice(0, 65), { name: "ECDH", namedCurve: "P-256" }, false, []);
      const iv = packed.slice(65, 77);
      const aes = await deriveKey(priv, ephPub, "decrypt");
      return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv }, aes, packed.slice(77)));
    },
  };
}

/** Fulfillment key generation helper (run once, offline). Returns raw public key hex and PKCS8 private key base64. */
export async function generateFulfillmentKeypair(): Promise<{ publicKeyHex: Hex; privateKeyPkcs8: string }> {
  const kp = await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pub = new Uint8Array(await subtle().exportKey("raw", kp.publicKey));
  const priv = new Uint8Array(await subtle().exportKey("pkcs8", kp.privateKey));
  return {
    publicKeyHex: `0x${Array.from(pub, (b) => b.toString(16).padStart(2, "0")).join("")}`,
    privateKeyPkcs8: toBase64(priv),
  };
}

export async function importFulfillmentPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  return subtle().importKey("pkcs8", bytes(fromBase64(pkcs8Base64)),{ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}
