import { z } from "zod";

/**
 * Wholesale request -> email. No wallet, no storage: the request is relayed to the brand's inbox through Brevo's
 * transactional API and nothing is kept on our side.
 *
 * Placeholder until Brevo is configured: without BREVO_API_KEY / MAYOREO_TO / BREVO_SENDER the route validates
 * the request and answers `{ ok: true, placeholder: true }`, so the page flow works end to end today.
 */
export const runtime = "nodejs";

const Inquiry = z.object({
  venue: z.string().trim().min(1).max(160),
  kind: z.string().trim().max(60),
  city: z.string().trim().min(1).max(120),
  volume: z.string().trim().max(60).default(""),
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).default(""),
  note: z.string().trim().max(2000).default(""),
  lang: z.enum(["ES", "EN"]).default("ES"),
  /** Honeypot: real people never see or fill it. */
  website: z.string().max(0).optional(),
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request): Promise<Response> {
  const parsed = Inquiry.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  const q = parsed.data;

  const key = process.env.BREVO_API_KEY;
  const to = process.env.MAYOREO_TO;
  const sender = process.env.BREVO_SENDER;
  if (!key || !to || !sender) return Response.json({ ok: true, placeholder: true });

  const rows: [string, string][] = [
    ["Lugar o empresa", q.venue],
    ["Tipo", q.kind],
    ["Ciudad y país", q.city],
    ["Cajas al mes", q.volume || "-"],
    ["Nombre", q.name],
    ["Correo", q.email],
    ["Teléfono", q.phone || "-"],
    ["Idioma", q.lang],
    ["Nota", q.note || "-"],
  ];
  const html = `<table cellpadding="6">${rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: sender, name: "Velvique Mayoreo" },
      to: [{ email: to }],
      replyTo: { email: q.email, name: q.name },
      subject: `Mayoreo · ${q.venue} · ${q.city}`,
      htmlContent: html,
    }),
  });
  if (!res.ok) return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  return Response.json({ ok: true });
}
