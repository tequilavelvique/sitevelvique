import type { Metadata } from "next";
import { VerifyForm } from "@/components/verify/VerifyForm";

export const metadata: Metadata = { title: "Verificar" };

export default function Page() {
  return <VerifyForm />;
}
