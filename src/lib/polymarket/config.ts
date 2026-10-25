export const POLYMARKET_HOSTS = {
  gamma: "https://gamma-api.polymarket.com",
  data: "https://data-api.polymarket.com",
  clob: "https://clob.polymarket.com",
} as const;

export const CLOB_WS_MARKET_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

export const POLYGON_CHAIN_ID = 137;

export type PolymarketService = keyof typeof POLYMARKET_HOSTS;

/**
 * Read-only upstream paths reachable through our proxy.
 * A plain entry matches the exact path or the path followed by "/<segment>".
 * An entry with ":id" matches that exact shape, with ":id" a numeric segment.
 */
export const PROXY_ALLOWLIST: Record<PolymarketService, readonly string[]> = {
  gamma: ["events", "events/slug", "markets", "tags", "tags/:id/related-tags/tags", "public-search", "public-profile"],
  data: ["v2/positions", "v2/activity", "v2/value", "v2/trades", "v2/holders"],
  clob: ["book", "prices-history", "midpoint", "price", "spread"],
};

/** Gamma list queries can take 15-25s on a cache miss; give them room before failing. */
export const UPSTREAM_TIMEOUT_MS = 20_000;
