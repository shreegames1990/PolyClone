/** Height of one implicit grid row in the masonry grid; items span whole rows. */
export const MASONRY_ROW_PX = 8;

/** Rows an item of `heightPx` needs, including `gapPx` of space below it. */
export function rowSpan(heightPx: number, gapPx: number): number {
  return Math.max(1, Math.ceil((Math.max(0, heightPx) + gapPx) / MASONRY_ROW_PX));
}
