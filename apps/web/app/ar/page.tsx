import type { Metadata } from "next";
import { ArTable } from "@/components/ar/ArTable";

export const metadata: Metadata = { title: "AR" };

/** `/ar`: place the glowing bottle on your table, then take a flash photo with the caption meme. */
export default function Page() {
  return <ArTable />;
}
