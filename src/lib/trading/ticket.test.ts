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
    expect(t.ticket).toEqual({ kind: "limit", tokenId: "T", side: "BUY", price: 0.42, shares: 10, expiry: "never" });
    expect(t.estimate).toEqual({ shares: 10, cost: 4.2, payout: 10, avgPrice: 0.42, fee: 0 });
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

  it("includes the taker fee in the balance check for market buys", () => {
    const fee = { rate: 0.05, exponent: 1, takerOnly: true };
    // $100 at 50¢ costs a 2.5% fee ($2.50): $101 is not enough, $103 is.
    expect(buildTicket({ ...base, amount: "100", available: 101, fee }).error).toBe("Not enough pUSD for this order.");
    const ok = buildTicket({ ...base, amount: "100", available: 103, fee });
    expect(ok.error).toBeNull();
    expect(ok.estimate?.fee).toBeCloseTo(2.5);
  });

  it("includes the fee in the balance check for limit buys", () => {
    const fee = { rate: 0.05, exponent: 1, takerOnly: true };
    // 100 shares at 50¢ = $50 + 2.5% fee = $51.25
    const t = buildTicket({ ...base, kind: "limit", limitPriceCents: "50", shares: "100", available: 51, fee });
    expect(t.error).toBe("Not enough pUSD for this order.");
    expect(buildTicket({ ...base, kind: "limit", limitPriceCents: "50", shares: "100", available: 52, fee }).estimate?.fee).toBeCloseTo(1.25);
  });

  it("lists the estimated fee in the confirmation preview", () => {
    const fee = { rate: 0.05, exponent: 1, takerOnly: true };
    const rows = buildTicket({ ...base, amount: "100", available: 1000, fee }).preview?.rows ?? [];
    expect(rows).toContainEqual({ label: "Est. fee", value: "$2.50" });
    expect(buildTicket(base).preview?.rows.some((r) => r.label === "Est. fee")).toBe(false);
  });

  it("reports no fee on markets without fees", () => {
    expect(buildTicket(base).estimate?.fee).toBe(0);
  });

  it("carries the chosen expiry on limit tickets and shows it in the preview", () => {
    const t = buildTicket({ ...base, kind: "limit", limitPriceCents: "42", shares: "10", expiry: "1d" });
    expect(t.ticket).toMatchObject({ kind: "limit", expiry: "1d" });
    expect(t.preview?.rows).toContainEqual({ label: "Expires", value: "1 day" });
  });

  it("stays quiet when only the prefilled limit price is set", () => {
    const t = buildTicket({ ...base, kind: "limit", limitPriceCents: "63", shares: "" });
    expect(t.error).toBeNull();
    expect(t.ticket).toBeNull();
  });

  it("returns no error for an empty form", () => {
    const t = buildTicket({ ...base, amount: "" });
    expect(t.ticket).toBeNull();
    expect(t.error).toBeNull();
  });
});
