import type { Lang } from "@velvique/content";

const loc = (lang: Lang) => (lang === "ES" ? "es-MX" : "en-US");

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(loc(lang), opts);
}

/** "11:48 PM": the night's clock format, same in both languages. */
export function nightTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function eventStamp(iso: string, lang: Lang): string {
  return `${formatDate(iso, lang, { weekday: "short", day: "numeric", month: "short" })} · ${nightTime(iso)}`;
}

/** A night's date as flyer parts: "SÁB", "18", "OCT". Blank parts when the date does not parse. */
export function dateParts(iso: string, lang: Lang): { weekday: string; day: string; month: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { weekday: "", day: "", month: "" };
  const clean = (s: string) => s.replace(".", "");
  return {
    weekday: clean(d.toLocaleDateString(loc(lang), { weekday: "short" })),
    day: String(d.getDate()).padStart(2, "0"),
    month: clean(d.toLocaleDateString(loc(lang), { month: "short" })),
  };
}
