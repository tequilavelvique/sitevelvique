import { type Address, type Hex, type PublicClient, type WalletClient, encodeFunctionData, parseEventLogs } from "viem";
import { ordersAbi, usdcAbi } from "@velvique/contracts";
import type { Quote } from "../quote";
import { signUsdcPermit } from "../permit";

export type PurchaseInput = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  buyer: Address;
  orders: Address;
  usdc: Address;
  quote: Quote;
  region: number;
  shippingURI: string;
  shippingHash: Hex;
};

export type PurchaseResult = { orderId: bigint; txHash: Hex };

const params = (i: Pick<PurchaseInput, "quote" | "region" | "shippingURI" | "shippingHash">) =>
  ({
    skuId: i.quote.skuId,
    qty: i.quote.qty,
    region: i.region,
    maxTotal: i.quote.maxTotal,
    deadline: i.quote.deadline,
    shippingURI: i.shippingURI,
    shippingHash: i.shippingHash,
  }) as const;

export async function usdcBalance(publicClient: PublicClient, usdc: Address, owner: Address): Promise<bigint> {
  return publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: "balanceOf", args: [owner] });
}

/** Rail A: one permit signature + one transaction. */
export async function purchaseWithUsdc(i: PurchaseInput, onStep?: (s: "permit" | "tx") => void): Promise<PurchaseResult> {
  const balance = await usdcBalance(i.publicClient, i.usdc, i.buyer);
  if (balance < i.quote.total) throw new InsufficientUsdcError(i.quote.total, balance);

  onStep?.("permit");
  const permit = await signUsdcPermit({
    publicClient: i.publicClient,
    walletClient: i.walletClient,
    owner: i.buyer,
    usdc: i.usdc,
    spender: i.orders,
    value: i.quote.total,
    deadline: i.quote.deadline,
  });

  onStep?.("tx");
  const { request } = await i.publicClient.simulateContract({
    account: i.buyer,
    address: i.orders,
    abi: ordersAbi,
    functionName: "purchaseWithPermit",
    args: [params(i), permit.value, permit.deadline, permit.v, permit.r, permit.s],
  });
  const txHash = await i.walletClient.writeContract(request);
  return { orderId: await orderIdFromTx(i.publicClient, txHash), txHash };
}

/**
 * Smart-account path (Base Account, rails C/D): approve + purchase as one EIP-5792 batch,
 * gas sponsored by the paymaster. Returns the calls; the web layer submits them with wagmi `sendCalls`.
 */
export function approveAndPurchaseCalls(i: Omit<PurchaseInput, "publicClient" | "walletClient">) {
  return [
    {
      to: i.usdc,
      data: encodeFunctionData({ abi: usdcAbi, functionName: "approve", args: [i.orders, i.quote.total] }),
    },
    {
      to: i.orders,
      data: encodeFunctionData({ abi: ordersAbi, functionName: "purchase", args: [params(i)] }),
    },
  ] as const;
}

export async function orderIdFromTx(publicClient: PublicClient, txHash: Hex): Promise<bigint> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("Purchase reverted");
  const [placed] = parseEventLogs({ abi: ordersAbi, eventName: "OrderPlaced", logs: receipt.logs });
  if (!placed) throw new Error("OrderPlaced not found in receipt");
  return placed.args.orderId;
}

export class InsufficientUsdcError extends Error {
  constructor(
    public readonly needed: bigint,
    public readonly have: bigint,
  ) {
    super(`Insufficient USDC: need ${needed}, have ${have}`);
  }
}
