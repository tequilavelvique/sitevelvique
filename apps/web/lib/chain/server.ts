import "server-only";
import { type Address, createPublicClient, http, keccak256, toBytes } from "viem";
import { base, baseSepolia } from "viem/chains";
import { catalogAbi, ordersAbi, provenanceAbi } from "@velvique/contracts";
import { env } from "@/lib/env";

/**
 * Server-side reads. Contract views do the indexing; nothing here is cached beyond
 * Next's short revalidation, and that cache is disposable, never a source of truth.
 */
export const publicClient = createPublicClient({
  chain: env.chainId === 8453 ? base : baseSepolia,
  transport: http(process.env.RPC_URL_SERVER || env.rpcUrl, { batch: true }),
});

export type OrderView = {
  id: bigint;
  buyer: Address;
  payer: Address;
  skuId: bigint;
  qty: number;
  region: number;
  status: number;
  createdBlock: bigint;
  createdAt: bigint;
  amount: bigint;
  shippingURI: string;
  shippingHash: `0x${string}`;
};

export type StatusEvent = { status: number; proofURI: string; txHash: `0x${string}`; blockNumber: bigint; timestamp: number };

export async function readOrder(id: bigint): Promise<{ order: OrderView; history: StatusEvent[] } | null> {
  if (!env.orders) return null;
  let o;
  try {
    o = await publicClient.readContract({ address: env.orders, abi: ordersAbi, functionName: "getOrder", args: [id] });
  } catch {
    return null;
  }

  // History is bounded by the order's own creation block, so the log range stays small.
  const logs = await publicClient.getContractEvents({
    address: env.orders,
    abi: ordersAbi,
    eventName: "OrderStatus",
    args: { orderId: id },
    fromBlock: o.createdBlock,
    toBlock: "latest",
  });

  const blocks = new Map<bigint, number>();
  await Promise.all(
    [...new Set(logs.map((l) => l.blockNumber))].map(async (bn) => {
      const b = await publicClient.getBlock({ blockNumber: bn });
      blocks.set(bn, Number(b.timestamp));
    }),
  );

  return {
    order: { id, ...o, skuId: BigInt(o.skuId) },
    history: logs.map((l) => ({
      status: Number(l.args.status),
      proofURI: l.args.proofURI ?? "",
      txHash: l.transactionHash,
      blockNumber: l.blockNumber,
      timestamp: blocks.get(l.blockNumber) ?? 0,
    })),
  };
}

export async function readSku(id: bigint) {
  if (!env.catalog) return null;
  try {
    return await publicClient.readContract({ address: env.catalog, abi: catalogAbi, functionName: "getSku", args: [id] });
  } catch {
    return null;
  }
}

export const serialHash = (serial: string) => keccak256(toBytes(serial));

export async function verifySerial(serial: string) {
  if (!env.provenance) return null;
  const [registered, bottle] = await publicClient.readContract({
    address: env.provenance,
    abi: provenanceAbi,
    functionName: "verify",
    args: [serialHash(serial)],
  });
  return { registered, bottle };
}
