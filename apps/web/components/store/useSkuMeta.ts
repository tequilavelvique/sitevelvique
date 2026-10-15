"use client";

import { useQuery } from "@tanstack/react-query";
import type { Lang } from "@velvique/content";
import { fetchJson } from "@velvique/vault/lens";
import { mediaUrl } from "@/lib/media";

/** SKU metadata JSON on Grove (brand ACL). Onchain holds only the URI. */
export type SkuMeta = {
  name: Record<Lang, string>;
  description?: Record<Lang, string>;
  image?: string; // lens://
  volumeMl?: number;
  unitsPerCase?: number;
  edition?: string;
};

export function useSkuMeta(uri: string | undefined) {
  return useQuery({
    queryKey: ["sku-meta", uri],
    queryFn: () => fetchJson<SkuMeta>(uri!),
    enabled: Boolean(uri),
    staleTime: 5 * 60_000,
    select: (m) => ({ ...m, imageUrl: mediaUrl(m.image) }),
  });
}
