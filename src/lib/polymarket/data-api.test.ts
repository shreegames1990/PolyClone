import { describe, expect, it } from "vitest";
import { parseActivity, parsePortfolioValue, parsePositions } from "./data-api";

const position = {
  token_id: "111",
  condition_id: "0xc",
  current_size: 136.5,
  avg_price: 0.4,
  total_cost_usdc: 54.6,
  current_price: 0.5,
  current_value: 68.25,
  total_pnl: 13.65,
  percent_pnl: 25,
  status: "OPEN",
  redeemable: false,
  title: "Will X?",
  icon: "x.png",
  event_slug: "evt",
  outcome: "Yes",
  outcome_index: 0,
  end_date: "2026-12-09",
};

describe("parsePositions", () => {
  it("unwraps the v2 envelope and maps snake_case", () => {
    const { items, nextCursor } = parsePositions({
      data: [position],
      pagination: { has_more: true, next_cursor: "n1" },
    });
    expect(nextCursor).toBe("n1");
    expect(items[0]).toEqual({
      tokenId: "111",
      title: "Will X?",
      icon: "x.png",
      eventSlug: "evt",
      outcome: "Yes",
      size: 136.5,
      avgPrice: 0.4,
      curPrice: 0.5,
      cost: 54.6,
      value: 68.25,
      pnl: 13.65,
      percentPnl: 25,
      redeemable: false,
      endDate: "2026-12-09",
    });
  });

  it("drops malformed rows and handles garbage", () => {
    expect(parsePositions({ data: [{ nope: 1 }, position] }).items).toHaveLength(1);
    expect(parsePositions("bad")).toEqual({ items: [], nextCursor: null });
  });
});

describe("parseActivity", () => {
  it("maps activity rows", () => {
    const { items } = parseActivity({
      data: [
        {
          timestamp: 1792135591,
          type: "TRADE",
          side: "BUY",
          size: 10,
          usdc_size: 4,
          price: 0.4,
          title: "Will X?",
          outcome: "Yes",
          event_slug: "evt",
          icon: "",
          transaction_hash: "0xt",
        },
      ],
    });
    expect(items[0]).toMatchObject({ type: "TRADE", side: "BUY", usdcSize: 4, timestamp: 1792135591000, txHash: "0xt" });
  });
});

describe("parsePortfolioValue", () => {
  it("reads the value from either shape", () => {
    expect(parsePortfolioValue({ data: { value: 849.8 } })).toBe(849.8);
    expect(parsePortfolioValue({ data: [{ value: 12 }] })).toBe(12);
    expect(parsePortfolioValue(null)).toBe(0);
  });
});
