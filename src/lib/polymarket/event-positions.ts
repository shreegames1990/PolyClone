import { buildMoneylineOptions } from "./moneyline";
import type { Position } from "./data-api";
import type { PolyEvent } from "./types";

/** A held position in one of the event's markets, shaped for the "All Positions" table. */
export interface EventPositionRow {
  readonly position: Position;
  readonly marketId: string;
  readonly outcomeIndex: number;
  /** "Moneyline", or the market label ("Spread -1.5", "Harry Kane"). */
  readonly type: string;
  /** Badge text: "BIL YES", "DRAW NO", "GETAFE CF". */
  readonly outcome: string;
  /** Team color for moneyline badges; null otherwise. */
  readonly color: string | null;
  /** Payout if the outcome wins: each share pays $1. */
  readonly toWin: number;
}

/** The user's positions in this event's markets, in market order, matched by token id. */
export function buildEventPositions(event: PolyEvent, positions: readonly Position[]): EventPositionRow[] {
  const byToken = new Map(positions.filter((p) => p.size > 0).map((p) => [p.tokenId, p]));
  const moneyline = new Map(buildMoneylineOptions(event).map((o) => [o.marketId, o]));

  return event.markets.flatMap((market) =>
    market.outcomes.flatMap((outcome, outcomeIndex) => {
      const position = outcome.tokenId ? byToken.get(outcome.tokenId) : undefined;
      if (!position) return [];
      const option = moneyline.get(market.id);
      const name = outcome.name.toUpperCase();
      return [
        {
          position,
          marketId: market.id,
          outcomeIndex,
          type: option ? "Moneyline" : market.label,
          outcome: option ? `${option.label} ${name}` : name,
          color: option?.color ?? null,
          toWin: position.size,
        },
      ];
    }),
  );
}
