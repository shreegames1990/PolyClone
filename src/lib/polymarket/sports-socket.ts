import { SPORTS_WS_URL } from "./config";
import { parseSportResult } from "./live-score";
import type { GameState } from "./types";

/** The slice of `WebSocket` the feed uses (a fake in tests). */
export interface SportsSocket {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface SportsFeed {
  /** Listens for game updates; the socket opens with the first listener. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Latest state of a game, or undefined until the socket reports it. */
  get(gameId: number): GameState | undefined;
}

const MAX_BACKOFF_MS = 30_000;
/** Keeps the socket through quick unmount/remount (navigation, StrictMode) before closing. */
const IDLE_CLOSE_MS = 5_000;

/** The server sends "ping" and expects "pong"; every other frame is a JSON `sport_result` (or a batch). */
function framesOf(data: unknown): unknown[] {
  if (typeof data !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * One shared connection to Polymarket's sports socket, holding the latest state per game.
 * Reconnects with exponential backoff while anyone listens.
 */
export function createSportsFeed({
  url,
  createSocket,
}: {
  url: string;
  createSocket: (url: string) => SportsSocket;
}): SportsFeed {
  let games: ReadonlyMap<number, GameState> = new Map();
  const listeners = new Set<() => void>();
  let socket: SportsSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;

  const onMessage = (data: unknown) => {
    if (data === "ping") {
      socket?.send("pong");
      return;
    }
    const results = framesOf(data).flatMap((frame) => parseSportResult(frame) ?? []);
    if (results.length === 0) return;
    games = new Map([...games, ...results.map((r) => [r.gameId, r.state] as const)]);
    listeners.forEach((listener) => listener());
  };

  const connect = () => {
    const current = createSocket(url);
    socket = current;
    current.onopen = () => {
      attempt = 0;
    };
    current.onmessage = (event) => onMessage(event.data);
    current.onerror = () => current.close();
    current.onclose = () => {
      if (socket !== current) return;
      socket = null;
      if (listeners.size === 0) return;
      retry = setTimeout(() => {
        retry = undefined;
        connect();
      }, Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt++));
    };
  };

  const disconnect = () => {
    clearTimeout(retry);
    retry = undefined;
    const current = socket;
    socket = null;
    attempt = 0;
    current?.close();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      clearTimeout(idle);
      if (!socket && retry === undefined) connect();
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        idle = setTimeout(() => listeners.size === 0 && disconnect(), IDLE_CLOSE_MS);
      };
    },
    get: (gameId) => games.get(gameId),
  };
}

let shared: SportsFeed | null = null;

/** The browser-wide feed, created on first use. */
export function sportsFeed(): SportsFeed {
  shared ??= createSportsFeed({ url: SPORTS_WS_URL, createSocket: (u) => new WebSocket(u) as unknown as SportsSocket });
  return shared;
}
