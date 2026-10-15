import type { Address } from "viem";

/**
 * Rails C and D share one client contract: ask our route handler for a session sized to the order total,
 * hand the buyer to the provider UI, then watch USDC arrive onchain. Webhooks only move the UI, never the record.
 */
export type OnrampRegion = "US" | "MX" | "LATAM";

export type OnrampSessionRequest = {
  destination: Address;
  /** USDC amount in 6-decimal units, as a string to survive JSON. */
  usdcAmount: string;
  region: OnrampRegion;
  /** Client-generated, opaque, not personal. Lets the provider dedupe retries. */
  partnerRef: string;
  /**
   * Coinbase Headless requires a verified email and phone for guest card checkout.
   * Forwarded to the provider in the same request, never stored or logged by us. Open question in guide section 9.
   */
  contact?: { email: string; phone: string; phoneVerifiedAt: string };
};

export type OnrampSession = {
  provider: "coinbase-headless" | "latam";
  orderId: string;
  /** Apple Pay / card widget URL to embed in an iframe or open. */
  paymentUrl: string;
  /** Total the buyer pays in fiat, provider-quoted. */
  fiatTotal?: { amount: string; currency: string };
};

export type OnrampStatus = "pending" | "processing" | "completed" | "failed";

export interface OnrampProvider {
  readonly id: OnrampSession["provider"];
  supports(region: OnrampRegion): boolean;
  createSession(req: OnrampSessionRequest): Promise<OnrampSession>;
  status(orderId: string): Promise<OnrampStatus>;
}

export async function requestOnrampSession(req: OnrampSessionRequest, endpoint = "/api/onramp"): Promise<OnrampSession> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`onramp ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function pollOnrampStatus(orderId: string, provider: OnrampSession["provider"], endpoint = "/api/onramp"): Promise<OnrampStatus> {
  const res = await fetch(`${endpoint}?orderId=${encodeURIComponent(orderId)}&provider=${provider}`);
  if (!res.ok) return "pending";
  const j = (await res.json()) as { status: OnrampStatus };
  return j.status;
}
