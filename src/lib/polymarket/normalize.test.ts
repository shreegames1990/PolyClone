import { describe, expect, it } from "vitest";
import { normalizeEvent, normalizeMarket, parseJsonArray } from "./normalize";

const rawMarket = {
  id: "123",
  question: "Will X happen?",
  conditionId: "0xabc",
  slug: "will-x-happen",
  groupItemTitle: "X",
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.62", "0.38"]',
  clobTokenIds: '["111", "222"]',
  volume: "12345.6",
  volume24hr: 500,
  liquidity: "999.1",
  bestBid: 0.61,
  bestAsk: 0.63,
  lastTradePrice: 0.62,
  oneDayPriceChange: 0.05,
  active: true,
  closed: false,
  acceptingOrders: true,
  orderPriceMinTickSize: 0.01,
  orderMinSize: 5,
  negRisk: false,
  endDate: "2026-11-03T00:00:00Z",
};

describe("parseJsonArray", () => {
  it("parses JSON-encoded arrays", () => {
    expect(parseJsonArray('["a","b"]')).toEqual(["a", "b"]);
  });

  it("passes arrays through", () => {
    expect(parseJsonArray(["a"])).toEqual(["a"]);
  });

  it("returns [] on bad input", () => {
    expect(parseJsonArray("not json")).toEqual([]);
    expect(parseJsonArray(undefined)).toEqual([]);
    expect(parseJsonArray('{"a":1}')).toEqual([]);
  });
});

describe("normalizeMarket", () => {
  it("parses outcomes into tokens with prices", () => {
    const m = normalizeMarket(rawMarket);
    expect(m.outcomes).toEqual([
      { name: "Yes", price: 0.62, tokenId: "111" },
      { name: "No", price: 0.38, tokenId: "222" },
    ]);
    expect(m.volume).toBeCloseTo(12345.6);
    expect(m.liquidity).toBeCloseTo(999.1);
    expect(m.tickSize).toBe("0.01");
    expect(m.minSize).toBe(5);
    expect(m.tradable).toBe(true);
    expect(m.label).toBe("X");
  });

  it("falls back to sensible defaults", () => {
    const m = normalizeMarket({ id: "1", question: "Q?" });
    expect(m.outcomes).toEqual([]);
    expect(m.tickSize).toBe("0.01");
    expect(m.minSize).toBe(5);
    expect(m.tradable).toBe(false);
    expect(m.label).toBe("Q?");
  });

  it("maps unusual tick sizes to the closest supported value", () => {
    expect(normalizeMarket({ ...rawMarket, orderPriceMinTickSize: 0.001 }).tickSize).toBe("0.001");
    expect(normalizeMarket({ ...rawMarket, orderPriceMinTickSize: "0.1" }).tickSize).toBe("0.1");
  });

  it("uses positionIds for v2 markets", () => {
    const m = normalizeMarket({
      ...rawMarket,
      version: "v2",
      clobTokenIds: undefined,
      positionIds: '["901", "902"]',
    });
    expect(m.outcomes.map((o) => o.tokenId)).toEqual(["901", "902"]);
    expect(m.tradable).toBe(true);
  });

  it("prefers numeric volume/liquidity fields when present", () => {
    const m = normalizeMarket({ ...rawMarket, volume: undefined, volumeNum: 42, liquidityNum: 7 });
    expect(m.volume).toBe(42);
    expect(m.liquidity).toBe(7);
  });

  it("is not tradable when closed", () => {
    expect(normalizeMarket({ ...rawMarket, closed: true }).tradable).toBe(false);
  });
});

describe("normalizeMarket sportsMarketType", () => {
  it("keeps Gamma's sportsMarketType and defaults to an empty string", () => {
    expect(normalizeMarket({ ...rawMarket, sportsMarketType: "moneyline" }).sportsMarketType).toBe("moneyline");
    expect(normalizeMarket(rawMarket).sportsMarketType).toBe("");
  });
});

describe("normalizeEvent", () => {
  it("normalizes nested markets and sorts by Yes price", () => {
    const e = normalizeEvent({
      id: "9",
      slug: "evt",
      title: "Event",
      volume: 100,
      volume24hr: "50",
      liquidity: 10,
      tags: [{ id: "1", label: "Politics", slug: "politics" }],
      markets: [
        { ...rawMarket, id: "a", outcomePrices: '["0.2","0.8"]' },
        { ...rawMarket, id: "b", outcomePrices: '["0.7","0.3"]' },
        { ...rawMarket, id: "c", closed: true, outcomePrices: '["0.9","0.1"]' },
      ],
    });
    expect(e.markets.map((m) => m.id)).toEqual(["b", "a", "c"]);
    expect(e.volume24hr).toBe(50);
    expect(e.tags[0]?.label).toBe("Politics");
    expect(e.isBinary).toBe(false);
  });

  it("puts moneyline markets first, in Gamma order, ahead of higher-priced markets", () => {
    const e = normalizeEvent({
      id: "9",
      slug: "nba-lal-uta",
      title: "Lakers vs. Jazz",
      markets: [
        { ...rawMarket, id: "home", sportsMarketType: "moneyline", outcomePrices: '["0.3","0.7"]' },
        { ...rawMarket, id: "draw", sportsMarketType: "moneyline", outcomePrices: '["0.1","0.9"]' },
        { ...rawMarket, id: "away", sportsMarketType: "moneyline", outcomePrices: '["0.6","0.4"]' },
        { ...rawMarket, id: "spread", sportsMarketType: "spreads", outcomePrices: '["0.9","0.1"]' },
        { ...rawMarket, id: "total", sportsMarketType: "totals", outcomePrices: '["0.5","0.5"]' },
      ],
    });
    expect(e.markets.map((m) => m.id)).toEqual(["home", "draw", "away", "spread", "total"]);
  });

  it("flags single-market events as binary", () => {
    const e = normalizeEvent({ id: "1", slug: "s", title: "T", markets: [rawMarket] });
    expect(e.isBinary).toBe(true);
  });

  it("tolerates missing fields", () => {
    const e = normalizeEvent({ id: "1" });
    expect(e.title).toBe("");
    expect(e.markets).toEqual([]);
    expect(e.tags).toEqual([]);
  });
});

describe("normalizeMarket fee schedule", () => {
  it("keeps the fee schedule when fees are enabled", () => {
    const m = normalizeMarket({ id: "f", feesEnabled: true, feeSchedule: { exponent: 1, rate: 0.05, takerOnly: true, rebateRate: 0.15 } });
    expect(m.fee).toEqual({ rate: 0.05, exponent: 1, takerOnly: true });
  });

  it("has no fee when fees are disabled or missing", () => {
    expect(normalizeMarket({ id: "f", feesEnabled: false, feeSchedule: { exponent: 1, rate: 0.05, takerOnly: true } }).fee).toBeNull();
    expect(normalizeMarket({ id: "g" }).fee).toBeNull();
  });
});

describe("normalizeEvent game", () => {
  it("keeps the Gamma game id, home/away teams, and live score", () => {
    const event = normalizeEvent({
      gameId: "9001",
      homeTeamName: "Arsenal",
      awayTeamName: "Chelsea",
      live: true,
      ended: false,
      score: "2-1",
      period: "2H",
      elapsed: 67,
    });
    expect(event.game).toEqual({
      id: 9001,
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      state: { live: true, ended: false, score: "2-1", period: "2H", elapsed: "67" },
    });
  });

  it("has no game without a Gamma game id", () => {
    expect(normalizeEvent({ score: "1-0", live: true }).game).toBeNull();
    expect(normalizeEvent({ gameId: null }).game).toBeNull();
  });
});
