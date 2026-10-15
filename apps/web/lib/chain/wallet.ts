"use client";

import { useCallback, useState } from "react";
import { connect, disconnect, getConnectors, switchChain } from "wagmi/actions";
import { useAccount } from "wagmi";
import { appKitModal, commerceChain, wagmiConfig } from "./config";

/**
 * Two doors, no accounts:
 *  - passkey: Base Account smart wallet, created on the spot with a passkey (no seed, no email).
 *  - wallet:  AppKit modal (WalletConnect, Coinbase Wallet, injected), or the injected wallet when AppKit is off.
 */
export function useWalletDoors() {
  const { address, isConnected, chainId } = useAccount();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, []);

  const connectPasskey = useCallback(
    () =>
      run(async () => {
        const c = getConnectors(wagmiConfig).find((x) => x.id === "baseAccount");
        if (!c) throw new Error("Base Account connector missing");
        await connect(wagmiConfig, { connector: c, chainId: commerceChain.id });
      }),
    [run],
  );

  const connectWallet = useCallback(
    () =>
      run(async () => {
        if (appKitModal) {
          await appKitModal.open();
          return;
        }
        const c = getConnectors(wagmiConfig).find((x) => x.type === "injected") ?? getConnectors(wagmiConfig)[0];
        if (!c) throw new Error("No wallet found");
        await connect(wagmiConfig, { connector: c, chainId: commerceChain.id });
      }),
    [run],
  );

  const ensureChain = useCallback(async () => {
    if (chainId !== commerceChain.id) await switchChain(wagmiConfig, { chainId: commerceChain.id });
  }, [chainId]);

  const leave = useCallback(() => run(() => disconnect(wagmiConfig)), [run]);

  return { address, isConnected, wrongChain: isConnected && chainId !== commerceChain.id, pending, error, connectPasskey, connectWallet, ensureChain, leave };
}
