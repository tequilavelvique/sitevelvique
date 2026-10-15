import { formatUnits } from "viem";
import { QUOTE_TTL_SECONDS, USDC_DECIMALS } from "./constants";

export type Quote = {
  skuId: bigint;
  qty: number;
  unitPrice: bigint;
  total: bigint;
  /** Passed to the contract as maxTotal: the price the buyer actually saw. */
  maxTotal: bigint;
  deadline: bigint;
};

/** Price is read from VelviqueCatalog at signing time; never from client state or a webhook. */
export function makeQuote(skuId: bigint, unitPrice: bigint, qty: number, nowSeconds = Math.floor(Date.now() / 1000)): Quote {
  if (!Number.isInteger(qty) || qty < 1) throw new Error("qty must be a positive integer");
  const total = unitPrice * BigInt(qty);
  return { skuId, qty, unitPrice, total, maxTotal: total, deadline: BigInt(nowSeconds + QUOTE_TTL_SECONDS) };
}

export function formatUsdc(amount: bigint, locale: "es-MX" | "en-US" = "es-MX"): string {
  const n = Number(formatUnits(amount, USDC_DECIMALS));
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} USDC`;
}
