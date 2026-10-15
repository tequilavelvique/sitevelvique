"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";
import type { Config as CdpConfig } from "@coinbase/cdp-core";
import { http, createConfig, createStorage, noopStorage, type Config } from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";
import { env } from "@/lib/env";
import { TOKENS } from "@velvique/content";

/**
 * Two doors into membership:
 *  1. Socials (Google, Apple, X) through Coinbase CDP embedded wallets: sign-in creates a Coinbase smart wallet
 *     (`createOnLogin: "smart"`). The CDP connector connects it to wagmi automatically after sign-in.
 *  2. Your own wallet through Reown AppKit (WalletConnect, Coinbase Wallet, browser wallets), then SIWE into CDP
 *     so socials can be linked to the same identity.
 * No Privy, no email/password. wagmi state itself uses noopStorage; the wallet/identity SDKs keep their own
 * sessions (CDP stores its auth token in localStorage, WalletConnect its pairing).
 */
const network = env.chainId === 8453 ? base : baseSepolia;
const storage = createStorage({ storage: noopStorage });
// `network` is typed as the base | baseSepolia union, so wagmi expects a key for both ids; only the active one is ever used.
const transports = { [network.id]: http(env.rpcUrl) } as Record<typeof network.id, ReturnType<typeof http>>;

export const cdpConfig: CdpConfig | null = env.cdpProjectId
  ? { projectId: env.cdpProjectId, ethereum: { createOnLogin: "smart" }, disableAnalytics: true }
  : null;

type AppKitInstance = ReturnType<typeof createAppKit>;

function build(): { config: Config; modal: AppKitInstance | null } {
  const connectors = [
    ...(cdpConfig
      ? [createCDPEmbeddedWalletConnector({ cdpConfig, providerConfig: { chains: [network], transports, announceProvider: false } })]
      : []),
    baseAccount({ appName: "Velvique" }),
    injected({ shimDisconnect: false }),
  ];

  if (!env.reownProjectId) {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn("[velvique] NEXT_PUBLIC_REOWN_PROJECT_ID missing: WalletConnect (AppKit) is off.");
    }
    return {
      config: createConfig({ chains: [network], transports, connectors, storage, ssr: true, multiInjectedProviderDiscovery: true }),
      modal: null,
    };
  }

  const adapter = new WagmiAdapter({
    networks: [network],
    projectId: env.reownProjectId,
    transports,
    connectors,
    storage,
    ssr: true,
  });

  const modal = createAppKit({
    adapters: [adapter],
    networks: [network],
    defaultNetwork: network,
    projectId: env.reownProjectId,
    metadata: {
      name: "Velvique",
      description: "Añejo cristalino. Venta solo por invitación.",
      url: typeof window === "undefined" ? "https://velviquetequila.com" : window.location.origin,
      icons: [],
    },
    // Socials live on the Coinbase door; AppKit is the "bring your own wallet" door.
    features: { email: false, socials: false, analytics: false, onramp: false, swaps: false, history: false },
    // No wallet UI on page load: wallets open only from an explicit sign-in / sign-up tap.
    enableReconnect: false,
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": TOKENS.led,
      "--w3m-color-mix": TOKENS.ink,
      "--w3m-color-mix-strength": 40,
      "--w3m-border-radius-master": "0px",
      "--w3m-font-family": "var(--font-cond), sans-serif",
    },
  });

  return { config: adapter.wagmiConfig, modal };
}

const built = build();
export const wagmiConfig = built.config;
/** Reown AppKit modal (WalletConnect + wallets list); null when no project id is configured. */
export const appKitModal = built.modal;
export const commerceChain = network;
export const CDP_CONNECTOR_ID = "cdp-embedded-wallet";
