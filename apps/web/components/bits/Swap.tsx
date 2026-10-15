"use client";

import type { ReactNode } from "react";
import RBCardSwap, { Card } from "@/components/reactbits/CardSwap/CardSwap";
import { prefersReducedMotion } from "@/lib/gsap";
import { useClientValue } from "@/lib/use-client-value";

export type SwapCard = { key: string; body: ReactNode };

/**
 * React Bits CardSwap: a short deck that deals itself, the front card dropping to the back every few seconds,
 * paused while you read it. The same cards are listed for screen readers; reduced motion gets the plain list
 * instead of the deck.
 */
export function Swap({ cards, label, width = 460, height = 340 }: { cards: SwapCard[]; label: string; width?: number; height?: number }) {
  const still = useClientValue(prefersReducedMotion, false);
  const list = (
    <ol className={still ? "vq-swap-list" : "sr-only"} aria-label={label}>
      {cards.map((c) => (
        <li key={c.key}>{c.body}</li>
      ))}
    </ol>
  );
  if (still) return list;
  return (
    <>
      {list}
      <div className="vq-swap" aria-hidden style={{ height: height + 140 }}>
        <RBCardSwap width={width} height={height} cardDistance={46} verticalDistance={54} delay={5200} pauseOnHover skewAmount={3} easing="linear">
          {cards.map((c) => (
            <Card key={c.key} customClass="vq-swap__card">
              {c.body}
            </Card>
          ))}
        </RBCardSwap>
      </div>
    </>
  );
}
