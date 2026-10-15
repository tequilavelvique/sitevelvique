/**
 * Typed invitation codes, stateless: VQ-BBBB-BBBB-MMMM-MMMM
 *   B = body (first char is the tier digit 1..3, then 7 random Crockford base32 chars)
 *   M = first 8 base32 chars of HMAC-SHA256(INVITE_CODE_SECRET, body)
 * No list of codes exists anywhere. One-time use is enforced onchain by the voucher nonce = keccak256(code).
 */
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function normalizeCode(input: string): string {
  const raw = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  const body = raw.startsWith("VQ") ? raw.slice(2) : raw;
  return body.length === 16 ? `VQ-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12)}` : input.trim().toUpperCase();
}

export function parseCode(code: string): { body: string; mac: string; tier: number } | null {
  const m = /^VQ-([0-9A-Z]{4})-([0-9A-Z]{4})-([0-9A-Z]{4})-([0-9A-Z]{4})$/.exec(code);
  if (!m) return null;
  const body = `${m[1]}${m[2]}`;
  const tier = Number(body[0]);
  if (!(tier >= 1 && tier <= 3)) return null;
  return { body, mac: `${m[3]}${m[4]}`, tier };
}

export function toBase32(bytes: Uint8Array, len: number): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < len) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= len) break;
  }
  return out;
}

export async function macFor(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return toBase32(sig, 8);
}

/** Constant-time compare for equal-length strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
