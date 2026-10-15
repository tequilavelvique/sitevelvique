import { type Address, type PublicClient, type WalletClient, parseSignature } from "viem";
import { usdcAbi } from "@velvique/contracts";

export type PermitSig = { value: bigint; deadline: bigint; v: number; r: `0x${string}`; s: `0x${string}` };

/**
 * EIP-2612 permit for USDC (FiatTokenV2). Domain name/version are read from the token,
 * because they differ between Base ("USD Coin") and Base Sepolia ("USDC").
 */
export async function signUsdcPermit(args: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  owner: Address;
  usdc: Address;
  spender: Address;
  value: bigint;
  deadline: bigint;
}): Promise<PermitSig> {
  const { publicClient, walletClient, owner, usdc, spender, value, deadline } = args;
  const [name, version, nonce] = await Promise.all([
    publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: "name" }),
    publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: "version" }),
    publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: "nonces", args: [owner] }),
  ]);
  const chainId = await publicClient.getChainId();

  const signature = await walletClient.signTypedData({
    account: owner,
    domain: { name, version, chainId, verifyingContract: usdc },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: { owner, spender, value, nonce, deadline },
  });

  const { r, s, v, yParity } = parseSignature(signature);
  return { value, deadline, r, s, v: Number(v ?? BigInt(yParity + 27)) };
}
