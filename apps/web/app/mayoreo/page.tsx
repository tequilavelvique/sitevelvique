import type { Metadata } from "next";
import { Mayoreo } from "@/components/mayoreo/Mayoreo";

export const metadata: Metadata = { title: "Mayoreo" };

/** `/mayoreo`: public wholesale brief; tier pricing appears in the store with a Mayoreo pass. */
export default function Page() {
  return <Mayoreo />;
}
