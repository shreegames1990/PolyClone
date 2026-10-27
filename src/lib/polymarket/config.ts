export const POLYMARKET_HOSTS = {
  gamma: "https://gamma-api.polymarket.com",
  data: "https://data-api.polymarket.com",
  clob: "https://clob.polymarket.com",
} as const;

export const CLOB_WS_MARKET_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

/** Live game scores (`sport_result` frames); matches the SDK's `environment.sports.ws`. */
export const SPORTS_WS_URL = "wss://sports-api.polymarket.com/ws";

export const POLYGON_CHAIN_ID = 137;

/** pUSD, Polymarket's collateral token on Polygon (checked against the SDK in config.test.ts). */
export const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as const;

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
