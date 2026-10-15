import { type Address, type Hex, isAddress, isHex } from "viem";

/** Client + server shape of a signed invitation. Links carry `?i=<base64url(json)>.<sig>`. */
export type SignedVoucher = {
  voucher: { to: Address; tier: number; nonce: Hex; deadline: string };
  sig: Hex;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function parseInviteParam(param: string | null): SignedVoucher | null {
  if (!param) return null;
  const dot = param.lastIndexOf(".");
  if (dot < 0) return null;
  try {
    const v = JSON.parse(b64urlDecode(param.slice(0, dot))) as SignedVoucher["voucher"];
    const sig = param.slice(dot + 1) as Hex;
    if (!isHex(sig) || !isHex(v.nonce) || !(v.to === ZERO || isAddress(v.to))) return null;
    if (![1, 2, 3].includes(v.tier) || !/^\d+$/.test(v.deadline)) return null;
    return { voucher: v, sig };
  } catch {
    return null;
  }
}

export function toContractVoucher(v: SignedVoucher["voucher"]) {
  return { to: v.to, tier: v.tier, nonce: v.nonce, deadline: BigInt(v.deadline) } as const;
}
