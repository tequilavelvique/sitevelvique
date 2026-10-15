"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getConnectors, reconnect } from "wagmi/actions";
import { CDP_CONNECTOR_ID, wagmiConfig } from "@/lib/chain/config";
import type { SiteContent } from "@/lib/content";
import { SiteProvider } from "./SiteProvider";
import { NightProvider } from "./NightProvider";
import { MembersProvider } from "./MembersProvider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

export function Providers({ content, children }: { content: SiteContent; children: ReactNode }) {
  // Query cache is in-memory and disposable; chain state is the record.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, gcTime: 5 * 60_000 } } }),
  );
  // Reconnecting every connector on mount probes Coinbase / Base Account, which pops their wallet UI on entry.
  // Only the CDP embedded wallet is restored, silently, from its existing session; everything else waits for a tap.
  useEffect(() => {
    const cdp = getConnectors(wagmiConfig).filter((c) => c.id === CDP_CONNECTOR_ID);
    if (cdp.length) void reconnect(wagmiConfig, { connectors: cdp }).catch(() => undefined);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <SiteProvider content={content}>
          <MembersProvider>
            <NightProvider>
              <SmoothScroll />
              {children}
            </NightProvider>
          </MembersProvider>
        </SiteProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
