#!/usr/bin/env node
/**
 * One-time, offline: generate the staging fulfillment keypair for the WebCrypto dev vault.
 * Public key -> NEXT_PUBLIC_FULFILLMENT_PUBKEY. Private key -> the fulfillment agent's secret store, never the repo.
 * Replaced entirely when the proprietary encryptor is plugged in via configureVault().
 */
const { subtle } = globalThis.crypto;
const kp = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const pub = Buffer.from(await subtle.exportKey("raw", kp.publicKey)).toString("hex");
const priv = Buffer.from(await subtle.exportKey("pkcs8", kp.privateKey)).toString("base64");
console.log(`NEXT_PUBLIC_FULFILLMENT_PUBKEY=0x${pub}`);
console.log(`FULFILLMENT_PRIVATE_KEY_PKCS8=${priv}   # store offline / in the fulfillment agent only`);
