import { indexEventOutcomes, type EventOutcomeInfo } from "./event-outcomes";
import type { Position } from "./data-api";
import type { PolyEvent } from "./types";

/** A held position in one of the event's markets, shaped for the "All Positions" table. */
export interface EventPositionRow extends EventOutcomeInfo {
  readonly position: Position;
  /** Payout if the outcome wins: each share pays $1. */
  readonly toWin: number;
}

/** The user's positions in this event's markets, in market order, matched by token id. */
export function buildEventPositions(event: PolyEvent, positions: readonly Position[]): EventPositionRow[] {
  const byToken = new Map(positions.filter((p) => p.size > 0).map((p) => [p.tokenId, p]));
  return [...indexEventOutcomes(event)].flatMap(([tokenId, info]) => {
    const position = byToken.get(tokenId);
    return position ? [{ ...info, position, toWin: position.size }] : [];
  });
}
