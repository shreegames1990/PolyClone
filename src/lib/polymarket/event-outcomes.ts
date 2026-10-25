import { buildMoneylineOptions } from "./moneyline";
import type { PolyEvent } from "./types";

/** How an outcome token of this event is labelled in position and order tables. */
export interface EventOutcomeInfo {
  readonly marketId: string;
  readonly outcomeIndex: number;
  /** "Moneyline", or the market label ("Spread -1.5", "Harry Kane"). */
  readonly type: string;
  /** Badge text: "BAR YES", "DRAW NO", "GETAFE CF". */
  readonly outcome: string;
  /** Team color for moneyline badges; null otherwise. */
  readonly color: string | null;
}

/** Outcome token id → label info for every outcome of the event, in market order. */
export function indexEventOutcomes(event: PolyEvent): Map<string, EventOutcomeInfo> {
  const moneyline = new Map(buildMoneylineOptions(event).map((o) => [o.marketId, o]));
  const index = new Map<string, EventOutcomeInfo>();
  for (const market of event.markets) {
    const option = moneyline.get(market.id);
    market.outcomes.forEach((outcome, outcomeIndex) => {
      if (!outcome.tokenId) return;
      const name = outcome.name.toUpperCase();
      index.set(outcome.tokenId, {
        marketId: market.id,
        outcomeIndex,
        type: option ? "Moneyline" : market.label,
        outcome: option ? `${option.label} ${name}` : name,
        color: option?.color ?? null,
      });
    });
  }
  return index;
}
