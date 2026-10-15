"use client";

import type { ReactNode } from "react";
import RBStack from "@/components/reactbits/Stack/Stack";
import { TOKENS } from "@velvique/content";
import { useClientValue } from "@/lib/use-client-value";

/** Phones in portrait: a thrown 3:4 print at full tilt is wider than the screen, so it lands straighter. */
const narrow = () => window.matchMedia("(max-width: 599px)").matches;

/**
 * React Bits Stack as a pile of flash prints left on the table: bone border, thrown at angles, the top one
 * picked up with a drag (or a tap, or arrow keys) and tucked under the rest. `onTop` reports which print is up.
 */
export function Prints({ prints, label, onTop }: { prints: ReactNode[]; label: string; onTop?: (index: number) => void }) {
  const phone = useClientValue(narrow, false);
  return (
    <div className="vq-prints" role="region" aria-label={label}>
      <RBStack
        cards={prints}
        layout="pile"
        visible={4}
        spread={0.9}
        depth={0.4}
        radius={1}
        frame={10}
        frameColor={TOKENS.bone}
        shadow
        tilt={phone ? 10 : 18}
        threshold={70}
        sendToBackOnClick
        onChange={onTop}
      />
    </div>
  );
}
