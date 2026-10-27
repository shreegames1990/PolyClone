"use client";

import { useCallback, useSyncExternalStore } from "react";
import { sportsFeed } from "@/lib/polymarket/sports-socket";
import type { GameState } from "@/lib/polymarket/types";

const unsubscribed = () => {};

/**
 * Latest state of a game from the shared sports socket, or undefined until it reports one.
 * Pass null to stay off the socket (non-game events).
 */
export function useLiveGame(gameId: number | null): GameState | undefined {
  const subscribe = useCallback(
    (listener: () => void) => (gameId === null ? unsubscribed : sportsFeed().subscribe(listener)),
    [gameId],
  );
  return useSyncExternalStore(
    subscribe,
    () => (gameId === null ? undefined : sportsFeed().get(gameId)),
    () => undefined,
  );
}
