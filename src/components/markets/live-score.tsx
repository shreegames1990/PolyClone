"use client";

import { useLiveGame } from "@/hooks/use-live-game";
import { clockLabel, isSoccerEvent, scoreline } from "@/lib/polymarket/live-score";
import type { PolyEvent } from "@/lib/polymarket/types";

/**
 * Scoreline for a live or finished soccer game: Gamma's score on first render, then
 * updates from the sports socket. Renders nothing before kick-off or for other events.
 */
export function LiveScore({ event }: { event: PolyEvent }) {
  const game = event.game && isSoccerEvent(event) ? event.game : null;
  const latest = useLiveGame(game?.id ?? null);
  if (!game) return null;

  const state = latest ?? game.state;
  const clock = clockLabel(state);
  const line = scoreline(event, state);
  if (!clock || !line) return null;

  const isLive = state.live && !state.ended;
  return (
    <div
      role="status"
      aria-label={isLive ? "Live score" : "Final score"}
      className="flex items-center justify-between gap-2 rounded-field bg-base-300/50 px-2.5 py-1.5 text-caption"
    >
      <span className="flex items-center gap-2 font-semibold">
        {isLive && (
          <span className="flex items-center gap-1 text-no">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-no" />
            LIVE
          </span>
        )}
        <span className="tabular-nums text-base-content/70">{clock}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5 font-semibold tabular-nums">
        <span className="truncate text-base-content/70">{line.home}</span>
        <span className="text-body-sm">{line.homeScore}</span>
        <span aria-hidden className="text-base-content/50">–</span>
        <span className="text-body-sm">{line.awayScore}</span>
        <span className="truncate text-base-content/70">{line.away}</span>
      </span>
    </div>
  );
}
