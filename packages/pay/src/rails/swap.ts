import { type Address, type Hex, type PublicClient, type WalletClient, erc20Abi, maxUint256 } from "viem";
import { NATIVE_TOKEN, SWAP_BUFFER_BPS } from "../constants";

/**
 * Rail B: pay with ETH or any Base token, settle USDC via 0x Swap API v2 (allowance-holder).
 * The API key stays server-side; the browser calls our `/api/swap` proxy.
 */
export type SwapPriceResponse = {
  buyAmount: string;
  sellAmount: string;
  liquidityAvailable: boolean;
};

export type SwapQuoteResponse = SwapPriceResponse & {
  issues?: { allowance?: { actual: string; spender: Address } | null };
  transaction: { to: Address; data: Hex; value: string; gas?: string; gasPrice?: string };
};

export type SwapRequest = { chainId: number; sellToken: Address; buyToken: Address; sellAmount: bigint; taker: Address };

const qs = (r: SwapRequest) =>
  new URLSearchParams({
    chainId: String(r.chainId),
    sellToken: r.sellToken,
    buyToken: r.buyToken,
    sellAmount: r.sellAmount.toString(),
    taker: r.taker,
  }).toString();

export async function swapPrice(r: SwapRequest, endpoint = "/api/swap"): Promise<SwapPriceResponse> {
  const res = await fetch(`${endpoint}?kind=price&${qs(r)}`);
  if (!res.ok) throw new Error(`swap price ${res.status}`);
  return res.json();
}

export async function swapQuote(r: SwapRequest, endpoint = "/api/swap"): Promise<SwapQuoteResponse> {
  const res = await fetch(`${endpoint}?kind=quote&${qs(r)}`);
  if (!res.ok) throw new Error(`swap quote ${res.status}`);
  return res.json();
}

/**
 * 0x v2 quotes by sellAmount. Probe the rate with a reference amount, then size the sell side
 * so the USDC out covers `usdcNeeded` plus a buffer.
 */
export async function sellAmountFor(r: Omit<SwapRequest, "sellAmount">, usdcNeeded: bigint, probe: bigint): Promise<bigint> {
  const p = await swapPrice({ ...r, sellAmount: probe });
  if (!p.liquidityAvailable) throw new Error("No liquidity for this token");
  const out = BigInt(p.buyAmount);
  if (out === 0n) throw new Error("Zero output");
  const raw = (usdcNeeded * probe + out - 1n) / out;
  return (raw * (10_000n + SWAP_BUFFER_BPS)) / 10_000n;
}

/** Executes the swap so USDC lands in the buyer's wallet; rail A then completes the purchase. */
export async function executeSwap(args: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  taker: Address;
  quote: SwapQuoteResponse;
  sellToken: Address;
}): Promise<Hex> {
  const { publicClient, walletClient, taker, quote, sellToken } = args;
  const spender = quote.issues?.allowance?.spender;
  if (spender && sellToken.toLowerCase() !== NATIVE_TOKEN.toLowerCase()) {
    const approveHash = await walletClient.writeContract({
      account: taker,
      chain: walletClient.chain,
      address: sellToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }
  const hash = await walletClient.sendTransaction({
    account: taker,
    chain: walletClient.chain,
    to: quote.transaction.to,
    data: quote.transaction.data,
    value: BigInt(quote.transaction.value || "0"),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Swap reverted");
  return hash;
}
