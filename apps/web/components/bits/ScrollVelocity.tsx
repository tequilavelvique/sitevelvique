"use client";

import RBScrollVelocity from "@/components/reactbits/ScrollVelocity/ScrollVelocity";

/** React Bits ScrollVelocity as the caption-meme ticker. Slow drift; speeds up and flips with scroll. */
export function ScrollVelocity({ items, velocity = 24 }: { items: string[]; velocity?: number }) {
  return (
    <div className="vq-ticker" aria-label={items.join(". ")}>
      <div aria-hidden>
        <RBScrollVelocity
          texts={[items.join("   /   ")]}
          velocity={velocity}
          numCopies={4}
          damping={60}
          stiffness={300}
          velocityMapping={{ input: [0, 1200], output: [0, 3] }}
          className="vq-ticker__text"
        />
      </div>
    </div>
  );
}
