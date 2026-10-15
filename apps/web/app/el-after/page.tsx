import type { Metadata } from "next";
import { ElAfter } from "@/components/after/ElAfter";

export const metadata: Metadata = { title: "El After" };

/** `/el-after`: flash photo archive, caption memes, events. Media and events from Grove. */
export default function Page() {
  return <ElAfter />;
}
