import { isAddress } from "viem";
import type { OnrampProvider, OnrampRegion, OnrampSessionRequest } from "@velvique/pay";
import { coinbaseHeadless, latamProvider } from "@velvique/pay/server";

/**
 * Mints a short-lived onramp session for exactly the order total, destination = the buyer's Base Account.
 * Provider status is polled by the browser only to move the UI; fulfillment watches `OrderPlaced` onchain.
 */
export const runtime = "nodejs";

const MAX_USDC = 50_000n * 1_000_000n;

function providers(): OnrampProvider[] {
  const list: OnrampProvider[] = [];
  if (process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET) {
    list.push(coinbaseHeadless({ keyId: process.env.CDP_API_KEY_ID, keySecret: process.env.CDP_API_KEY_SECRET }));
  }
  const latam = latamProvider();
  if (latam) list.push(latam);
  return list;
}

const pick = (region: OnrampRegion) => providers().find((p) => p.supports(region));

export async function POST(req: Request): Promise<Response> {
  let body: OnrampSessionRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!isAddress(body.destination) || !/^\d+$/.test(body.usdcAmount) || !body.partnerRef) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const amount = BigInt(body.usdcAmount);
  if (amount <= 0n || amount > MAX_USDC) return Response.json({ error: "bad_amount" }, { status: 400 });

  const provider = pick(body.region);
  if (!provider) return Response.json({ error: "no_provider_for_region" }, { status: 501 });

  try {
    const session = await provider.createSession(body);
    return Response.json(session, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ error: "provider_error", detail: (e as Error).message }, { status: 502 });
  }
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  const id = url.searchParams.get("provider");
  const provider = providers().find((p) => p.id === id);
  if (!orderId || !provider) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json({ status: await provider.status(orderId) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "pending" });
  }
}
