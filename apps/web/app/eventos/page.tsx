import type { Metadata } from "next";
import { Events } from "@/components/events/Events";

export const metadata: Metadata = { title: "Eventos" };

export default function Page() {
  return <Events />;
}
