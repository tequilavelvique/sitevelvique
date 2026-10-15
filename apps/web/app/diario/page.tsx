import type { Metadata } from "next";
import { Journal } from "@/components/journal/Journal";

export const metadata: Metadata = { title: "Diario" };

/** `/diario`: journal index from the Grove manifest (layout already loaded it). */
export default function Page() {
  return <Journal />;
}
