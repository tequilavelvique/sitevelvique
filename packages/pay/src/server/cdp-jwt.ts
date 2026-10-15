import { createPrivateKey, randomBytes, type KeyObject } from "node:crypto";
import { SignJWT } from "jose";

/**
 * Coinbase Developer Platform bearer JWT, one per request (2 minute lifetime).
 * Supports the current Ed25519 keys (base64, 64 bytes: seed || public) and legacy ES256 PEM keys.
 */
function loadKey(secret: string): { key: KeyObject; alg: "EdDSA" | "ES256" } {
  if (secret.includes("BEGIN")) {
    return { key: createPrivateKey(secret.replace(/\\n/g, "\n")), alg: "ES256" };
  }
  const raw = Buffer.from(secret, "base64");
  if (raw.length !== 64) throw new Error("CDP Ed25519 secret must decode to 64 bytes");
  const b64url = (b: Buffer) => b.toString("base64url");
  const key = createPrivateKey({
    format: "jwk",
    key: { kty: "OKP", crv: "Ed25519", d: b64url(raw.subarray(0, 32)), x: b64url(raw.subarray(32)) },
  });
  return { key, alg: "EdDSA" };
}

export async function cdpJwt(opts: {
  keyId: string;
  keySecret: string;
  method: "GET" | "POST";
  host: string;
  path: string;
}): Promise<string> {
  const { key, alg } = loadKey(opts.keySecret);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uris: [`${opts.method} ${opts.host}${opts.path}`] })
    .setProtectedHeader({ alg, kid: opts.keyId, typ: "JWT", nonce: randomBytes(16).toString("hex") })
    .setSubject(opts.keyId)
    .setIssuer("cdp")
    .setAudience(["cdp_service"])
    .setNotBefore(now)
    .setExpirationTime(now + 120)
    .sign(key);
}
