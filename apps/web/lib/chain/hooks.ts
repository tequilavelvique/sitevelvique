"use client";

import { useAccount, useReadContract } from "wagmi";
import { accessAbi, catalogAbi } from "@velvique/contracts";
import { env } from "@/lib/env";

/** Highest pass tier held by the connected wallet. 0 = none. Identity is the address. */
export function usePass() {
  const { address, isConnected, connector } = useAccount();
  const q = useReadContract({
    address: env.access ?? undefined,
    abi: accessAbi,
    functionName: "passOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && env.access), staleTime: 15_000 },
  });
  return {
    address,
    isConnected,
    isSmartAccount: connector?.id === "baseAccount" || connector?.id === "coinbaseWalletSDK",
    tier: (q.data ?? 0) as number,
    loading: q.isLoading,
    refetch: q.refetch,
    deployed: Boolean(env.access),
  };
}

export function useSkus() {
  return useReadContract({
    address: env.catalog ?? undefined,
    abi: catalogAbi,
    functionName: "listSkus",
    args: [0n, 50n],
    query: { enabled: Boolean(env.catalog), staleTime: 15_000 },
  });
}
