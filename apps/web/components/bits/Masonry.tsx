"use client";

import RBMasonry from "@/components/reactbits/Masonry/Masonry";

export type MasonryPhoto = { id: string; img: string; url: string; height: number };

/** React Bits Masonry for the flash archive: frames develop in from blur, a hair smaller on hover. */
export function Masonry({ items, onOpen }: { items: MasonryPhoto[]; onOpen: (item: MasonryPhoto, el: HTMLElement) => void }) {
  return (
    <div className="vq-masonry">
      <RBMasonry
        items={items}
        ease="vq-drift"
        duration={0.7}
        stagger={0.05}
        animateFrom="bottom"
        scaleOnHover
        hoverScale={0.97}
        blurToFocus
        colorShiftOnHover={false}
        onItemClick={(item, el) => onOpen(item as MasonryPhoto, el)}
      />
    </div>
  );
}
