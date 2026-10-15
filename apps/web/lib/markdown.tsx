import { Fragment, type ReactNode } from "react";
import { resolveLens } from "@velvique/vault/lens";
import { Flash } from "@/components/bits/Flash";

/**
 * Minimal markdown for admin-authored journal entries, rendered straight to React elements
 * (no dangerouslySetInnerHTML, so a body can never inject markup). Supports:
 *   # / ## / ### headings · paragraphs · > quotes · - and 1. lists · ![alt](lens://…) images
 *   (several image lines in one block render as a photo grid)
 *   **bold** · *italic* · [link](https://… | /path | lens://…) · --- rule
 * Two-line "Setup: / Velvique: punchline" blocks starting with `::` render as the caption meme.
 */
const SAFE_HREF = /^(https?:\/\/|\/(?!\/)|lens:\/\/|mailto:)/i;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[4]) out.push(<em key={k}>{m[4]}</em>);
    else if (m[6] && m[7]) {
      const href = m[7];
      if (SAFE_HREF.test(href)) {
        const external = /^https?:/i.test(href);
        out.push(
          <a key={k} href={href.startsWith("lens://") ? resolveLens(href) : href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className="md-link">
            {m[6]}
          </a>,
        );
      } else out.push(m[6]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className="md">
      {blocks.map((block, bi) => {
        const k = `b${bi}`;
        const lines = block.split("\n");
        const first = lines[0] ?? "";

        if (/^---+$/.test(block.trim())) return <hr key={k} />;

        const h = /^(#{1,3})\s+(.*)$/.exec(first);
        if (h && lines.length === 1) {
          const level = h[1]!.length;
          const content = inline(h[2]!, k);
          return level === 1 ? <h2 key={k}>{content}</h2> : level === 2 ? <h3 key={k}>{content}</h3> : <h4 key={k}>{content}</h4>;
        }

        // Several images on consecutive lines: a photo grid, for photo essays.
        const IMG = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
        if (lines.length > 1 && lines.every((l) => IMG.test(l.trim()))) {
          const shots = lines.map((l) => IMG.exec(l.trim())!).filter((m) => SAFE_HREF.test(m[2]!));
          return (
            <div key={k} className="md-gallery">
              {shots.map((m, i) => (
                <figure key={i}>
                  <Flash>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveLens(m[2]!)} alt={m[1] ?? ""} loading="lazy" />
                  </Flash>
                  {m[1] ? <figcaption className="eyebrow">{m[1]}</figcaption> : null}
                </figure>
              ))}
            </div>
          );
        }

        const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(block.trim());
        if (img && SAFE_HREF.test(img[2]!)) {
          return (
            <figure key={k}>
              <Flash>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveLens(img[2]!)} alt={img[1] ?? ""} loading="lazy" />
              </Flash>
              {img[1] ? <figcaption className="eyebrow">{img[1]}</figcaption> : null}
            </figure>
          );
        }

        if (lines.every((l) => l.startsWith("::"))) {
          return (
            <div key={k} className="meme md-meme">
              {lines.map((l, i) => (
                <span key={i}>{l.replace(/^::\s?/, "")}</span>
              ))}
            </div>
          );
        }

        if (lines.every((l) => l.startsWith(">"))) {
          return <blockquote key={k}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), k)}</blockquote>;
        }

        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={k}>
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^[-*]\s+/, ""), `${k}-${i}`)}</li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => /^\d+\.\s+/.test(l))) {
          return (
            <ol key={k}>
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\d+\.\s+/, ""), `${k}-${i}`)}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={k}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {inline(l, `${k}-${i}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export { readingMinutes } from "@velvique/vault/cms";
