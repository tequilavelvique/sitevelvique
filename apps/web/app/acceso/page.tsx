import type { Metadata } from "next";
import { Suspense } from "react";
import { AccesoFlow } from "@/components/acceso/AccesoFlow";
import { MembersArea } from "@/components/members/MembersArea";

export const metadata: Metadata = { title: "Acceso", robots: { index: false } };

/**
 * `/acceso`: the membership door (socials -> Coinbase smart wallet, or your wallet via WalletConnect).
 * A signed invitation link (`?i=` EIP-712 voucher) goes through the voucher redeem flow instead.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  if (!i) return <MembersArea />;
  return (
    <Suspense fallback={null}>
      <AccesoFlow />
    </Suspense>
  );
}
