"use client";

import { useEffect, useRef, useState } from "react";
import { MASONRY_ROW_PX, rowSpan } from "@/lib/masonry";
import { cn } from "@/lib/utils";

/** Space below each card (also the column gap). */
const GAP_PX = 16;
/** Span used before an item is measured (server render, no ResizeObserver). */
const ESTIMATED_HEIGHT_PX = { standard: 200, wide: 240 } as const;

/**
 * Masonry grid: 8px implicit rows with dense packing. Each MasonryItem measures its content
 * and spans as many rows as it needs, so cards keep their natural height and fill gaps.
 */
export function MasonryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid grid-flow-row-dense grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      style={{ gridAutoRows: `${MASONRY_ROW_PX}px` }}
    >
      {children}
    </div>
  );
}

/** One masonry cell; `wide` spans two columns from the small breakpoint up. */
export function MasonryItem({ wide = false, children }: { wide?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState(() => rowSpan(ESTIMATED_HEIGHT_PX[wide ? "wide" : "standard"], GAP_PX));

  useEffect(() => {
    const content = ref.current?.firstElementChild;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      setSpan(rowSpan(height, GAP_PX));
    });
    observer.observe(content, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("min-w-0 self-start", wide && "sm:col-span-2")} style={{ gridRowEnd: `span ${span}` }}>
      {children}
    </div>
  );
}
