"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { CLOB_WS_MARKET_URL } from "@/lib/polymarket/config";
import { applySocketMessage, bookFromRest, emptyBooks, type BooksState } from "@/lib/polymarket/orderbook";
import { pmGet } from "@/lib/polymarket/client-fetch";

const PING_INTERVAL_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;

type Action = { type: "message"; payload: unknown } | { type: "snapshot"; assetId: string; raw: unknown };

function reducer(state: BooksState, action: Action): BooksState {
  if (action.type === "message") return applySocketMessage(state, action.payload);
  const current = state[action.assetId];
  const rest = bookFromRest(action.raw);
  // The socket's own snapshot is newer than a slow REST response: keep its levels,
  // but take tick size / min order size, which only REST provides.
  if (current) return { ...state, [action.assetId]: { ...current, tickSize: rest.tickSize ?? current.tickSize, minOrderSize: rest.minOrderSize ?? current.minOrderSize } };
  return { ...state, [action.assetId]: rest };
}

export type SocketStatus = "connecting" | "live" | "offline";

/**
 * Order books for the given CLOB token IDs: a REST snapshot first, then live
 * updates from the market WebSocket with automatic reconnects.
 */
export function useLiveBooks(tokenIds: readonly string[]) {
  const [books, dispatch] = useReducer(reducer, emptyBooks);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const key = tokenIds.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    let cancelled = false;

    ids.forEach((assetId) => {
      pmGet("clob", "book", { token_id: assetId })
        .then((raw) => !cancelled && dispatch({ type: "snapshot", assetId, raw }))
        .catch((error: unknown) => console.warn("[books] snapshot failed", assetId, error));
    });

    let socket: WebSocket | null = null;
    let ping: ReturnType<typeof setInterval> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = () => {
      setStatus("connecting");
      socket = new WebSocket(CLOB_WS_MARKET_URL);
      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
        socket?.send(JSON.stringify({ assets_ids: ids, type: "market" }));
        ping = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send("PING"), PING_INTERVAL_MS);
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        if (event.data === "PONG") return;
        try {
          dispatch({ type: "message", payload: JSON.parse(event.data) });
        } catch {
          // Non-JSON frames (e.g. "INVALID OPERATION") carry no book data.
        }
      };
      socket.onclose = () => {
        clearInterval(ping);
        if (cancelled) return;
        setStatus("offline");
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt++);
        retry = setTimeout(connect, delay);
      };
      socket.onerror = () => socket?.close();
    };
    connect();

    return () => {
      cancelled = true;
      clearInterval(ping);
      clearTimeout(retry);
      socket?.close();
    };
  }, [key]);

  // Only expose books for the current tokens; others may be stale from an earlier subscription.
  const current = useMemo(
    () => Object.fromEntries(key.split(",").filter((id) => books[id]).map((id) => [id, books[id]!])) as BooksState,
    [books, key],
  );
  return { books: current, status };
}
