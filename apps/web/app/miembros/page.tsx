import type { Metadata } from "next";
import { MembersArea } from "@/components/members/MembersArea";

export const metadata: Metadata = { title: "Miembros", robots: { index: false } };

/** `/miembros`: Coinbase identity (socials or your wallet) -> onchain ERC-1155 membership -> sealed content. */
export default function Page() {
  return <MembersArea />;
}
