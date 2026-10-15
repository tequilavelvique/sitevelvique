"use client";

import type { ReactNode } from "react";
import RBStack from "@/components/reactbits/Stack/Stack";
import { TOKENS } from "@velvique/content";

/**
 * React Bits Stack as a pile of flash prints left on the table: bone border, thrown at angles, the top one
 * picked up with a drag (or a tap, or arrow keys) and tucked under the rest. `onTop` reports which print is up.
 */
export function Prints({ prints, label, onTop }: { prints: ReactNode[]; label: string; onTop?: (index: number) => void }) {
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
        tilt={18}
        threshold={70}
        sendToBackOnClick
        onChange={onTop}
      />
    </div>
  );
}
