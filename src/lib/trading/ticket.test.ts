import { describe, expect, it } from "vitest";
import { buildTicket, type TicketInput } from "./ticket";

const book = {
  bids: [{ price: 0.48, size: 100 }],
  asks: [{ price: 0.5, size: 100 }, { price: 0.52, size: 100 }],
  lastTradePrice: null,
};

const base: TicketInput = {
  tokenId: "T",
  outcomeName: "Yes",
  side: "BUY",
  kind: "market",
  amount: "10",
  limitPriceCents: "",
  shares: "",
  tickSize: "0.01",
  minSize: 5,
  book,
  available: 1000,
};

describe("buildTicket", () => {
  it("builds a market buy from dollars", () => {
    const t = buildTicket(base);
    expect(t.error).toBeNull();
    expect(t.ticket).toEqual({ kind: "market", tokenId: "T", side: "BUY", amount: 10, worstPrice: 0.5 });
    expect(t.estimate?.shares).toBeCloseTo(20);
    expect(t.estimate?.payout).toBeCloseTo(20);
    expect(t.preview?.title).toBe("Buy Yes");
  });

  it("builds a market sell from shares", () => {
    const t = buildTicket({ ...base, side: "SELL", amount: "50" });
    expect(t.ticket).toEqual({ kind: "market", tokenId: "T", side: "SELL", amount: 50, worstPrice: 0.48 });
    expect(t.estimate?.payout).toBeCloseTo(24);
  });

  it("reports missing liquidity for market orders", () => {
    const t = buildTicket({ ...base, amount: "1000" });
    expect(t.ticket).toBeNull();
    expect(t.error).toMatch(/liquidity/);
  });

  it("reports a missing order book", () => {
    const t = buildTicket({ ...base, book: undefined });
    expect(t.ticket).toBeNull();
    expect(t.error).toMatch(/order book/);
  });

  it("builds a limit order from cents and shares", () => {
    const t = buildTicket({ ...base, kind: "limit", limitPriceCents: "42", shares: "10" });
    expect(t.error).toBeNull();
    expect(t.ticket).toEqual({ kind: "limit", tokenId: "T", side: "BUY", price: 0.42, shares: 10 });
    expect(t.estimate).toEqual({ shares: 10, cost: 4.2, payout: 10, avgPrice: 0.42 });
  });

  it("validates limit orders", () => {
    expect(buildTicket({ ...base, kind: "limit", limitPriceCents: "42", shares: "1" }).error).toMatch(/Minimum/);
    expect(buildTicket({ ...base, kind: "limit", limitPriceCents: "42.5", shares: "10" }).error).toMatch(/tick/);
  });

  it("rejects non-decimal input like exponents", () => {
    expect(buildTicket({ ...base, amount: "1e2" }).error).toMatch(/valid number/);
    expect(buildTicket({ ...base, kind: "limit", limitPriceCents: "0x10", shares: "10" }).error).toMatch(/valid number/);
  });

  it("enforces the $1 minimum on market buys", () => {
    expect(buildTicket({ ...base, amount: "0.5" }).error).toMatch(/Minimum/);
  });

  it("checks the available balance", () => {
    expect(buildTicket({ ...base, amount: "20", available: 10 }).error).toMatch(/Not enough pUSD/);
    expect(buildTicket({ ...base, side: "SELL", amount: "50", available: 10 }).error).toMatch(/only own/);
    expect(buildTicket({ ...base, kind: "limit", limitPriceCents: "50", shares: "10", available: 1 }).error).toMatch(/Not enough pUSD/);
  });

  it("skips the balance check when the balance is unknown", () => {
    expect(buildTicket({ ...base, available: undefined }).error).toBeNull();
  });

  it("returns no error for an empty form", () => {
    const t = buildTicket({ ...base, amount: "" });
    expect(t.ticket).toBeNull();
    expect(t.error).toBeNull();
  });
});
