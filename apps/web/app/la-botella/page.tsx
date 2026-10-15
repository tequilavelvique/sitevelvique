import type { Metadata } from "next";
import { LaBotella } from "@/components/botella/LaBotella";

export const metadata: Metadata = { title: "La Botella" };

/** `/la-botella`: liquid, process, tasting notes, the LED, serve rituals, the opening. */
export default function Page() {
  return <LaBotella />;
}
