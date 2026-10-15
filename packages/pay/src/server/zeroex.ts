/**
 * 0x Swap API v2 proxy (allowance-holder). Keeps the API key off the client.
 * Only whitelisted query params are forwarded and buyToken is pinned to USDC.
 */
const BASE_URL = "https://api.0x.org/swap/allowance-holder";

export async function zeroExProxy(
  kind: "price" | "quote",
  q: { chainId: string; sellToken: string; buyToken: string; sellAmount: string; taker: string },
  apiKey: string,
  usdc: string,
): Promise<Response> {
  if (q.buyToken.toLowerCase() !== usdc.toLowerCase()) {
    return Response.json({ error: "buyToken must be USDC" }, { status: 400 });
  }
  const params = new URLSearchParams({
    chainId: q.chainId,
    sellToken: q.sellToken,
    buyToken: q.buyToken,
    sellAmount: q.sellAmount,
    taker: q.taker,
  });
  const res = await fetch(`${BASE_URL}/${kind}?${params}`, {
    headers: { "0x-api-key": apiKey, "0x-version": "v2" },
    cache: "no-store",
  });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
