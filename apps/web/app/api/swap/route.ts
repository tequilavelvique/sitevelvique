import { isAddress } from "viem";
import { USDC } from "@velvique/pay";
import { zeroExProxy } from "@velvique/pay/server";
import { env } from "@/lib/env";

/** Rail B proxy to 0x Swap API v2. buyToken is pinned to USDC on the commerce chain. */
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const key = process.env.ZEROX_API_KEY;
  if (!key) return Response.json({ error: "not_configured" }, { status: 503 });

  const u = new URL(req.url).searchParams;
  const kind = u.get("kind") === "quote" ? "quote" : "price";
  const q = {
    chainId: u.get("chainId") ?? "",
    sellToken: u.get("sellToken") ?? "",
    buyToken: u.get("buyToken") ?? "",
    sellAmount: u.get("sellAmount") ?? "",
    taker: u.get("taker") ?? "",
  };
  if (q.chainId !== String(env.chainId) || !isAddress(q.sellToken) || !isAddress(q.taker) || !/^\d+$/.test(q.sellAmount)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  return zeroExProxy(kind, q, key, USDC[env.chainId]);
}
