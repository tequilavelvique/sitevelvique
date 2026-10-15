#!/usr/bin/env node
/**
 * Invitation generator. Prints to stdout only; nothing is written anywhere.
 *
 *   node scripts/invite.mjs link  --tier 1 [--to 0xabc] [--days 14] [--count 20]
 *   node scripts/invite.mjs code  --tier 1 [--count 20]
 *   node scripts/invite.mjs qr    --tier 1 [--count 20]   (code inside a link, for event QR; no contracts needed)
 *
 * link: EIP-712 voucher signed by VOUCHER_SIGNER_KEY -> https://<site>/acceso?i=<payload>.<sig>
 *       (print as QR for events; open links can be redeemed once by anyone).
 * code: typed code VQ-XXXX-XXXX-XXXX-XXXX, HMAC'd with INVITE_CODE_SECRET; the server signs at redeem time.
 *
 * Env: VOUCHER_SIGNER_KEY, INVITE_CODE_SECRET, NEXT_PUBLIC_ACCESS_ADDRESS, NEXT_PUBLIC_CHAIN_ID, SITE_URL
 */
import { createHmac, randomBytes } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(3).reduce((acc, v, i, arr) => (v.startsWith("--") ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []),
);
const mode = process.argv[2];
const tier = Number(args.tier ?? 1);
const count = Number(args.count ?? 1);
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const b32 = (bytes, len) => {
  let bits = 0, value = 0, out = "";
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
};

if (![1, 2, 3].includes(tier)) throw new Error("--tier must be 1, 2 or 3");

if (mode === "code" || mode === "qr") {
  const site = process.env.SITE_URL ?? "https://velviquetequila.com";
  const secret = process.env.INVITE_CODE_SECRET;
  if (!secret) throw new Error("INVITE_CODE_SECRET missing");
  for (let i = 0; i < count; i++) {
    const body = `${tier}${b32(randomBytes(8), 7)}`;
    const mac = b32(createHmac("sha256", secret).update(body).digest(), 8);
    const code = `VQ-${body.slice(0, 4)}-${body.slice(4)}-${mac.slice(0, 4)}-${mac.slice(4)}`;
    console.log(mode === "qr" ? `${site}/acceso?code=${code}` : code);
  }
} else if (mode === "link") {
  const key = process.env.VOUCHER_SIGNER_KEY;
  const access = process.env.NEXT_PUBLIC_ACCESS_ADDRESS;
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532);
  const site = process.env.SITE_URL ?? "https://velviquetequila.com";
  if (!key || !access) throw new Error("VOUCHER_SIGNER_KEY and NEXT_PUBLIC_ACCESS_ADDRESS required");
  // viem only for signed links (contracts mode); code/qr modes run without installing anything.
  const { privateKeyToAccount } = await import("viem/accounts");
  const { keccak256, toBytes } = await import("viem");
  const account = privateKeyToAccount(key);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(args.days ?? 14) * 86400);
  for (let i = 0; i < count; i++) {
    const voucher = {
      to: args.to ?? "0x0000000000000000000000000000000000000000",
      tier,
      nonce: keccak256(toBytes(`0x${randomBytes(32).toString("hex")}`)),
      deadline,
    };
    const sig = await account.signTypedData({
      domain: { name: "VelviqueAccess", version: "1", chainId, verifyingContract: access },
      types: {
        Voucher: [
          { name: "to", type: "address" },
          { name: "tier", type: "uint8" },
          { name: "nonce", type: "bytes32" },
          { name: "deadline", type: "uint64" },
        ],
      },
      primaryType: "Voucher",
      message: voucher,
    });
    const payload = Buffer.from(JSON.stringify({ ...voucher, deadline: deadline.toString() })).toString("base64url");
    console.log(`${site}/acceso?i=${payload}.${sig}`);
  }
} else {
  console.log("usage: node scripts/invite.mjs <code|qr|link> --tier 1 [--count N] [--to 0x..] [--days 14]");
  process.exit(1);
}
