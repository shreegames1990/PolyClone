import { describe, expect, it } from "vitest";
import { buildEventOrders, restingPrices, type OpenOrderLike } from "./event-orders";
import { normalizeEvent } from "./normalize";

const HOME = "FC Barcelona";
const AWAY = "Real Madrid CF";

const event = normalizeEvent({
  id: "1",
  teams: [
    { name: HOME, abbreviation: "bar", color: "#004d98" },
    { name: AWAY, abbreviation: "rea", color: "#febe10" },
  ],
  markets: [
    { id: "h", conditionId: "0xcond-h", groupItemTitle: HOME, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["h-yes","h-no"]' },
    { id: "d", groupItemTitle: `Draw (${HOME} vs. ${AWAY})`, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["d-yes","d-no"]' },
    { id: "a", groupItemTitle: AWAY, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["a-yes","a-no"]' },
  ],
});

const order = (overrides: Partial<OpenOrderLike> = {}): OpenOrderLike => ({
  id: "o1",
  tokenId: "h-yes",
  side: "BUY",
  price: "0.61",
  originalSize: "30",
  sizeMatched: "0",
  orderType: "GTC",
  ...overrides,
});

describe("buildEventOrders", () => {
  it("shapes this event's resting orders like polymarket.com", () => {
    const [row] = buildEventOrders(event, [order()]);
    expect(row).toEqual({
      id: "o1",
      marketId: "h",
      outcomeIndex: 0,
      type: "Moneyline",
      side: "Buy",
      outcome: "BAR YES",
      color: "#004d98",
      price: 0.61,
      filled: 0,
      size: 30,
      total: 18.3,
      expiresAt: null,
    });
  });

  it("ignores orders on other events and keeps expiry dates", () => {
    const rows = buildEventOrders(event, [
      order({ tokenId: "elsewhere" }),
      order({ id: "o2", tokenId: "d-no", side: "SELL", price: "0.85", originalSize: "10", sizeMatched: "4", expiresAt: "2026-10-30T00:00:00Z" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "o2", side: "Sell", outcome: "DRAW NO", filled: 4, size: 10, total: 8.5, expiresAt: "2026-10-30T00:00:00Z" });
  });
});

describe("buildEventOrders fallback matching", () => {
  it("matches by condition id and outcome name when the token id differs (v2 markets)", () => {
    const [row] = buildEventOrders(event, [order({ tokenId: "clob-token-not-in-gamma", conditionId: "0xcond-h", outcome: "No" })]);
    expect(row).toMatchObject({ marketId: "h", outcomeIndex: 1, outcome: "BAR NO" });
  });

  it("does not match on condition id alone with an unknown outcome", () => {
    expect(buildEventOrders(event, [order({ tokenId: "x", conditionId: "0xcond-h", outcome: "Maybe" })])).toEqual([]);
  });
});

describe("restingPrices", () => {
  it("marks bid levels for buys and ask levels for sells of one token", () => {
    const marks = restingPrices(
      [order({ price: "0.61" }), order({ id: "o2", side: "SELL", price: "0.65" }), order({ id: "o3", tokenId: "a-yes", price: "0.2" })],
      "h-yes",
    );
    expect(marks.bids.has(0.61)).toBe(true);
    expect(marks.asks.has(0.65)).toBe(true);
    expect(marks.bids.has(0.2)).toBe(false);
  });

  it("normalizes price precision so 0.610 matches a 0.61 level", () => {
    expect(restingPrices([order({ price: "0.610" })], "h-yes").bids.has(0.61)).toBe(true);
  });
});
