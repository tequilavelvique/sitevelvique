"use client";

import RBFlowingMenu from "@/components/reactbits/FlowingMenu/FlowingMenu";
import { TOKENS } from "@velvique/content";

export type FlowingItem = { key: string; label: string; href: string; image?: string | null; onSelect: () => void };

/**
 * React Bits FlowingMenu, restyled: bone band on ink, the marquee carries the label and a flash photo
 * from the Grove archive when there is one. Typography overrides live in reactbits-theme.css.
 */
export function FlowingMenu({ items }: { items: FlowingItem[] }) {
  return (
    <div className="vq-flowing" style={{ height: "min(62svh, 560px)" }}>
      <RBFlowingMenu
        items={items.map((i) => ({ link: i.href, text: i.label, image: i.image ?? undefined, onSelect: i.onSelect }))}
        speed={18}
        textColor={TOKENS.bone}
        bgColor="transparent"
        marqueeBgColor={TOKENS.bone}
        marqueeTextColor={TOKENS.ink}
        borderColor="#4EA9D529"
      />
    </div>
  );
}
