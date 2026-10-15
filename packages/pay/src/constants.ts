import type { Address } from "viem";

export const BASE = 8453 as const;
export const BASE_SEPOLIA = 84532 as const;
export type CommerceChainId = typeof BASE | typeof BASE_SEPOLIA;

export const USDC: Record<CommerceChainId, Address> = {
  [BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [BASE_SEPOLIA]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

export const USDC_DECIMALS = 6;

/** Quotes expire fast; the contract rejects anything past `deadline`. */
export const QUOTE_TTL_SECONDS = 10 * 60;

/** Slippage headroom when swapping into USDC (rail B). Excess USDC stays with the buyer. */
export const SWAP_BUFFER_BPS = 150n;

export const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export type Rail = "usdc" | "swap" | "card-us" | "card-latam";
