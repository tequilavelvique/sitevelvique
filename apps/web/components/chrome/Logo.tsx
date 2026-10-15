import type { CSSProperties } from "react";

/**
 * The Velvique logo (on Grove, trimmed to the ink). Drawn as a mask filled with currentColor so it takes
 * the surrounding text color; `shine` gives the hero its slow bone-to-pale-blue sheen. Size it by height or width.
 */
export function Logo({ height, width, shine = false, style }: { height?: number | string; width?: number | string; shine?: boolean; style?: CSSProperties }) {
  return <span role="img" aria-label="Velvique" className={shine ? "logo logo--shine" : "logo"} style={{ height: width ? "auto" : height, width, ...style }} />;
}
