import { cardOutcomes } from "./card-outcomes";
import type { PolyEvent } from "./types";

/** "wide" cards span two masonry columns when there is room; others span one. */
export type CardSize = "standard" | "wide";

/** Cards that stack a market list get extra width for long market names. */
export function cardSize(event: PolyEvent): CardSize {
  if (event.isBinary) return "standard";
  return cardOutcomes(event).layout === "list" ? "wide" : "standard";
}
