import { describe, expect, it } from "vitest";
import {
  estimateMarketBuy,
  estimateMarketSell,
  limitOrderSummary,
  roundToTick,
  validateLimitOrder,
  validateMarketOrder,
} from "./order-math";

const asks = [
  { price: 0.5, size: 100 },
  { price: 0.52, size: 50 },
  { price: 0.6, size: 1000 },
];
const bids = [
  { price: 0.48, size: 100 },
  { price: 0.45, size: 200 },
];

describe("roundToTick", () => {
  it("rounds to the nearest tick", () => {
    expect(roundToTick(0.5349, "0.01")).toBe(0.53);
    expect(roundToTick(0.5351, "0.001")).toBe(0.535);
    expect(roundToTick(0.56, "0.1")).toBe(0.6);
  });
});

describe("limitOrderSummary", () => {
  it("computes cost, payout and profit for a buy", () => {
    expect(limitOrderSummary({ side: "BUY", price: 0.4, shares: 10 })).toEqual({
      total: 4,
      payout: 10,
      profit: 6,
    });
  });

  it("computes proceeds for a sell", () => {
    expect(limitOrderSummary({ side: "SELL", price: 0.4, shares: 10 })).toEqual({
      total: 4,
      payout: 4,
      profit: 0,
    });
  });
});

describe("estimateMarketBuy", () => {
  it("fills against the cheapest asks first", () => {
    const est = estimateMarketBuy(asks, 76);
    // 100 @ 0.50 = 50, then 26/0.52 = 50 @ 0.52
    expect(est.shares).toBeCloseTo(150);
    expect(est.avgPrice).toBeCloseTo(76 / 150);
    expect(est.worstPrice).toBe(0.52);
    expect(est.filled).toBe(true);
  });

  it("sorts unsorted asks", () => {
    const est = estimateMarketBuy([...asks].reverse(), 25);
    expect(est.shares).toBeCloseTo(50);
  });

  it("reports partial fill when liquidity is insufficient", () => {
    const est = estimateMarketBuy([{ price: 0.5, size: 10 }], 100);
    expect(est.shares).toBe(10);
    expect(est.spent).toBe(5);
    expect(est.filled).toBe(false);
  });

  it("handles an empty book", () => {
    expect(estimateMarketBuy([], 10)).toEqual({
      shares: 0,
      spent: 0,
      avgPrice: 0,
      worstPrice: 0,
      filled: false,
    });
  });
});

describe("estimateMarketSell", () => {
  it("fills against the highest bids first", () => {
    const est = estimateMarketSell([...bids].reverse(), 150);
    expect(est.proceeds).toBeCloseTo(100 * 0.48 + 50 * 0.45);
    expect(est.worstPrice).toBe(0.45);
    expect(est.filled).toBe(true);
  });

  it("reports partial fill", () => {
    const est = estimateMarketSell(bids, 1000);
    expect(est.sharesSold).toBe(300);
    expect(est.filled).toBe(false);
  });
});

describe("validateLimitOrder", () => {
  const base = { price: 0.5, shares: 10, tickSize: "0.01" as const, minSize: 5 };

  it("accepts a valid order", () => {
    expect(validateLimitOrder(base)).toBeNull();
  });

  it("rejects prices outside the tick range", () => {
    expect(validateLimitOrder({ ...base, price: 0 })).toMatch(/between/);
    expect(validateLimitOrder({ ...base, price: 1 })).toMatch(/between/);
  });

  it("rejects prices not on the tick", () => {
    expect(validateLimitOrder({ ...base, price: 0.505 })).toMatch(/tick/);
  });

  it("rejects size below minimum", () => {
    expect(validateLimitOrder({ ...base, shares: 2 })).toMatch(/Minimum/);
  });

  it("rejects non-finite input", () => {
    expect(validateLimitOrder({ ...base, shares: Number.NaN })).toMatch(/shares/);
  });
});

describe("validateMarketOrder", () => {
  it("requires a positive amount", () => {
    expect(validateMarketOrder({ amount: 0, filled: true })).toMatch(/amount/);
  });

  it("requires enough liquidity", () => {
    expect(validateMarketOrder({ amount: 5, filled: false })).toMatch(/liquidity/);
  });

  it("accepts a valid order", () => {
    expect(validateMarketOrder({ amount: 5, filled: true })).toBeNull();
  });
});
