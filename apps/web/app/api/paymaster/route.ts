import { env } from "@/lib/env";

/**
 * ERC-7677 paymaster proxy. The CDP paymaster URL embeds a key, so wallets talk to this route instead.
 * Only the two paymaster methods pass, and only for the chain we sell on. Contract allowlisting
 * (Access, Orders, Provenance, USDC) is configured on the CDP paymaster itself.
 */
export const runtime = "nodejs";

const ALLOWED = new Set(["pm_getPaymasterStubData", "pm_getPaymasterData"]);
const chainHex = `0x${env.chainId.toString(16)}`;

type RpcReq = { id?: unknown; jsonrpc?: string; method?: string; params?: unknown[] };

export async function POST(req: Request): Promise<Response> {
  const upstream = process.env.PAYMASTER_URL;
  if (!upstream) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: RpcReq;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  // params: [userOp, entryPoint, chainId, context]
  if (!body.method || !ALLOWED.has(body.method) || String(body.params?.[2]).toLowerCase() !== chainHex) {
    return Response.json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "method not allowed" } }, { status: 200 });
  }

  const res = await fetch(upstream, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
