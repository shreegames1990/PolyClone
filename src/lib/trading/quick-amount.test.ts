import { describe, expect, it } from "vitest";
import { adjustAmount, maxBuyShares, QUICK_DOLLARS, QUICK_SHARES, stepLimitPrice } from "./quick-amount";

describe("adjustAmount", () => {
  it("treats empty, invalid or negative input as zero", () => {
    expect(adjustAmount("", 20)).toBe("20");
    expect(adjustAmount("abc", 1)).toBe("1");
    expect(adjustAmount("-5", 1)).toBe("1");
  });

  it("adds and subtracts without going below zero", () => {
    expect(adjustAmount("20", 100)).toBe("120");
    expect(adjustAmount("50", -10)).toBe("40");
    expect(adjustAmount("5", -10)).toBe("0");
  });

  it("keeps cents and avoids float noise", () => {
    expect(adjustAmount("0.1", 0.2)).toBe("0.3");
    expect(adjustAmount("12.5", 1)).toBe("13.5");
  });

  it("offers Polymarket's quick amounts", () => {
    expect(QUICK_DOLLARS).toEqual([1, 20, 100]);
    expect(QUICK_SHARES).toEqual([-100, -10, 10, 100]);
  });
});

describe("stepLimitPrice", () => {
  it("steps by one tick in cents", () => {
    expect(stepLimitPrice("71", "0.01", 1)).toBe("72");
    expect(stepLimitPrice("71", "0.01", -1)).toBe("70");
    expect(stepLimitPrice("71.5", "0.001", 1)).toBe("71.6");
  });

  it("starts from the given fallback when empty or invalid", () => {
    expect(stepLimitPrice("", "0.01", 1, 50)).toBe("51");
    expect(stepLimitPrice("x", "0.01", -1, 50)).toBe("49");
  });

  it("stays within one tick of 0¢ and 100¢", () => {
    expect(stepLimitPrice("1", "0.01", -1)).toBe("1");
    expect(stepLimitPrice("99", "0.01", 1)).toBe("99");
    expect(stepLimitPrice("0.1", "0.001", -1)).toBe("0.1");
  });
});

describe("maxBuyShares", () => {
  it("returns whole shares affordable at the limit price", () => {
    expect(maxBuyShares(156.74, "71")).toBe("220");
  });

  it("returns empty when balance or price is unknown or invalid", () => {
    expect(maxBuyShares(undefined, "71")).toBe("");
    expect(maxBuyShares(100, "")).toBe("");
    expect(maxBuyShares(100, "0")).toBe("");
  });
});
