import type { Metadata } from "next";
import { Store } from "@/components/store/Store";

export const metadata: Metadata = { title: "Tienda", robots: { index: false } };

/** `/tienda`: pass holders only. Catalog, eligibility and price are read from VelviqueCatalog. */
export default function Page() {
  return <Store />;
}
