"use client";

import type { Address } from "viem";
import { getWalletClient } from "wagmi/actions";
import { adminAcl, publishJson, readFresh, replaceJson, uploadMedia, type Signer } from "@velvique/vault";
import { emptyManifest, parseManifest, type SiteManifest } from "@velvique/vault/cms";
import { wagmiConfig } from "@/lib/chain/config";
import { env } from "@/lib/env";

/**
 * Admin-side Grove operations. The connected admin wallet signs every edit (Grove ACL = wallet-only),
 * so no server key can change brand content. Use an EOA: Grove recovers the signer from the signature.
 */
export const MEMBERS_RECIPIENT = "0x0000000000000000000000000000000000000000" as const;

export const acl = (admin: Address) => adminAcl(admin, env.chainId);

export async function adminSigner(): Promise<Signer> {
  const wc = await getWalletClient(wagmiConfig);
  return { signMessage: ({ message }) => wc.signMessage({ account: wc.account, message }) };
}

export async function readManifest(): Promise<SiteManifest> {
  if (!env.groveSiteUri) throw new Error("NEXT_PUBLIC_GROVE_SITE_URI missing");
  const m = parseManifest(await readFresh(env.groveSiteUri));
  if (!m) throw new Error("Site manifest is malformed");
  return m;
}

/** Read fresh, apply, write back in place, then ask the site to refetch. Returns the saved manifest. */
export async function mutateManifest(admin: Address, fn: (m: SiteManifest) => SiteManifest): Promise<SiteManifest> {
  const next = fn(await readManifest());
  await replaceJson(env.groveSiteUri!, next, await adminSigner(), acl(admin));
  await fetch("/api/revalidate", { method: "POST" }).catch(() => undefined);
  return next;
}

export async function bootstrapManifest(admin: Address): Promise<string> {
  return (await publishJson(emptyManifest(), acl(admin), "velvique-site.json")).uri;
}

export async function uploadImage(admin: Address, file: File): Promise<{ uri: string; w: number; h: number }> {
  let w = 1;
  let h = 1;
  try {
    const bmp = await createImageBitmap(file);
    w = bmp.width;
    h = bmp.height;
    bmp.close();
  } catch {
    /* non-image or unsupported: keep 1:1 */
  }
  const { uri } = await uploadMedia(file, acl(admin));
  return { uri, w, h };
}
