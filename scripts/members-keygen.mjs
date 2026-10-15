#!/usr/bin/env node
/**
 * One-time setup for membership. Prints env lines; writes nothing.
 *  - NEXT_PUBLIC_MEMBERS_PUBKEY / MEMBERS_PRIVATE_KEY_PKCS8: P-256 pair. The admin seals members content to the
 *    public half in the browser; only the server opens it.
 *  - MEMBERSHIP_MINTER_KEY: relayer key. Gets only MINTER_ROLE on VelviqueAccess (Membership Ignition module,
 *    parameter `relayer`). Fund its address with a little Base ETH.
 *  - MEMBERS_SALT: salts the onchain identity hash.
 *  - INVITE_CODE_SECRET: HMAC secret for VQ-… codes (invite-only drops).
 */
import { randomBytes } from "node:crypto";

const { subtle } = globalThis.crypto;
const kp = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const pub = Buffer.from(await subtle.exportKey("raw", kp.publicKey)).toString("hex");
const priv = Buffer.from(await subtle.exportKey("pkcs8", kp.privateKey)).toString("base64");
const minterKey = `0x${randomBytes(32).toString("hex")}`;

let minterAddress = "(run again after `npm install` to print the relayer address)";
try {
  const { privateKeyToAccount } = await import("viem/accounts");
  minterAddress = privateKeyToAccount(minterKey).address;
} catch {
  /* viem not installed yet */
}

console.log("# public (apps/web/.env.local)");
console.log(`NEXT_PUBLIC_MEMBERS_PUBKEY=0x${pub}`);
console.log("\n# server only (Vercel env, never commit)");
console.log(`MEMBERS_PRIVATE_KEY_PKCS8=${priv}`);
console.log(`MEMBERSHIP_MINTER_KEY=${minterKey}`);
console.log(`MEMBERS_SALT=${randomBytes(24).toString("base64url")}`);
console.log(`INVITE_CODE_SECRET=${randomBytes(32).toString("base64url")}`);
console.log(`\n# relayer address -> ignition/membership.json "relayer", then fund with Base ETH`);
console.log(`# ${minterAddress}`);
