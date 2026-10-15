import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** `/admin`: Grove CMS. Articles, events, flash archive, media slots, onchain members. */
export default function Page() {
  return <AdminConsole />;
}
