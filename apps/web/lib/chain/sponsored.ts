"use client";

import { type Abi, type Address, type ContractFunctionArgs, type ContractFunctionName, type Hex, type Log, encodeFunctionData } from "viem";
import { getCapabilities, sendCalls, sendTransaction, waitForCallsStatus, waitForTransactionReceipt } from "wagmi/actions";
import { wagmiConfig, commerceChain } from "./config";

/**
 * Gas is on us where the wallet supports it: EIP-5792 batch + ERC-7677 paymaster through our `/api/paymaster` proxy
 * (the CDP paymaster URL holds a key, so it never reaches the browser). EOAs fall back to plain transactions.
 */
const PAYMASTER_PROXY = "/api/paymaster";

export type Call = { to: Address; data: Hex; value?: bigint };

type Caps = { paymasterService?: { supported?: boolean }; atomic?: { status?: string } };

async function capabilities(account: Address): Promise<Caps> {
  try {
    const all = (await getCapabilities(wagmiConfig, { account, chainId: commerceChain.id })) as unknown as Caps & Record<string, Caps>;
    return all[String(commerceChain.id)] ?? all;
  } catch {
    return {};
  }
}

export async function sendSponsored(account: Address, calls: readonly Call[]): Promise<{ logs: Log[]; txHash?: Hex }> {
  const caps = await capabilities(account);

  if (caps.paymasterService?.supported) {
    const paymasterUrl = new URL(PAYMASTER_PROXY, window.location.origin).toString();
    const { id } = await sendCalls(wagmiConfig, {
      account,
      chainId: commerceChain.id,
      calls: calls.map((c) => ({ to: c.to, data: c.data, value: c.value })),
      capabilities: { paymasterService: { url: paymasterUrl } },
    });
    const res = await waitForCallsStatus(wagmiConfig, { id });
    if (res.status !== "success") throw new Error("Batched call failed");
    return { logs: (res.receipts ?? []).flatMap((r) => r.logs as Log[]), txHash: res.receipts?.[0]?.transactionHash };
  }

  const logs: Log[] = [];
  let txHash: Hex | undefined;
  for (const c of calls) {
    txHash = await sendTransaction(wagmiConfig, { account, chainId: commerceChain.id, to: c.to, data: c.data, value: c.value });
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: txHash, chainId: commerceChain.id });
    if (receipt.status !== "success") throw new Error("Transaction reverted");
    logs.push(...receipt.logs);
  }
  return { logs, txHash };
}

export function encodeCall<const abi extends Abi, name extends ContractFunctionName<abi, "nonpayable" | "payable">>(
  to: Address,
  abi: abi,
  functionName: name,
  args: ContractFunctionArgs<abi, "nonpayable" | "payable", name>,
): Call {
  return { to, data: encodeFunctionData({ abi, functionName, args } as never) };
}
