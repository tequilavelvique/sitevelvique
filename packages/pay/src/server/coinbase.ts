import { formatUnits } from "viem";
import { USDC_DECIMALS } from "../constants";
import type { OnrampProvider, OnrampSession, OnrampSessionRequest, OnrampStatus } from "../rails/onramp";
import { cdpJwt } from "./cdp-jwt";

/**
 * Rail C: Coinbase Headless Onramp. Card / Apple Pay, US only, USDC delivered on Base.
 * Docs: docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order
 */
const HOST = "api.cdp.coinbase.com";
const ORDERS_PATH = "/platform/v2/onramp/orders";

type CreateOrderResponse = {
  order: { orderId: string; status: string; paymentTotal?: string; paymentCurrency?: string };
  paymentLink?: { url: string; paymentLinkType?: string };
};

const mapStatus = (s: string): OnrampStatus => {
  if (s.endsWith("COMPLETED")) return "completed";
  if (s.endsWith("FAILED")) return "failed";
  if (s.endsWith("PROCESSING")) return "processing";
  return "pending";
};

export function coinbaseHeadless(env: { keyId: string; keySecret: string }): OnrampProvider {
  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const jwt = await cdpJwt({ ...env, method, host: HOST, path });
    const res = await fetch(`https://${HOST}${path}`, {
      method,
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`coinbase ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  return {
    id: "coinbase-headless",
    supports: (r) => r === "US",

    async createSession(req: OnrampSessionRequest): Promise<OnrampSession> {
      if (!req.contact) throw new Error("Coinbase headless requires verified email and phone");
      const res = await call<CreateOrderResponse>("POST", ORDERS_PATH, {
        purchaseAmount: formatUnits(BigInt(req.usdcAmount), USDC_DECIMALS),
        purchaseCurrency: "USDC",
        paymentCurrency: "USD",
        paymentMethod: "GUEST_CHECKOUT_APPLE_PAY",
        destinationAddress: req.destination,
        destinationNetwork: "base",
        email: req.contact.email,
        phoneNumber: req.contact.phone,
        phoneNumberVerifiedAt: req.contact.phoneVerifiedAt,
        agreementAcceptedAt: new Date().toISOString(),
        partnerUserRef: req.partnerRef,
      });
      if (!res.paymentLink?.url) throw new Error("coinbase: no payment link");
      return {
        provider: "coinbase-headless",
        orderId: res.order.orderId,
        paymentUrl: res.paymentLink.url,
        fiatTotal: res.order.paymentTotal ? { amount: res.order.paymentTotal, currency: res.order.paymentCurrency ?? "USD" } : undefined,
      };
    },

    async status(orderId: string): Promise<OnrampStatus> {
      const res = await call<{ order: { status: string } }>("GET", `${ORDERS_PATH}/${encodeURIComponent(orderId)}`);
      return mapStatus(res.order.status);
    },
  };
}
