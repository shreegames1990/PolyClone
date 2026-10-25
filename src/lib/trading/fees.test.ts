import { describe, expect, it } from "vitest";
import { feeShareOfSpend, maxSpendAfterFees, takerFeeUsd, type FeeSchedule } from "./fees";

// Sports markets: rate 0.05, exponent 1, taker only (Gamma feeSchedule).
const SPORTS: FeeSchedule = { rate: 0.05, exponent: 1, takerOnly: true };

describe("takerFeeUsd", () => {
  it("charges shares × rate × (p(1-p))^exponent", () => {
    // 191,276 shares at 60¢: 191276 × 0.05 × 0.24 = 2295.312 (matches the CLOB's fee estimate)
    expect(takerFeeUsd(191_276, 0.6, SPORTS)).toBeCloseTo(2295.312, 3);
  });

  it("is zero without a fee schedule", () => {
    expect(takerFeeUsd(100, 0.6, null)).toBe(0);
  });
});

describe("feeShareOfSpend", () => {
  it("is rate × (1 - p) for exponent 1", () => {
    expect(feeShareOfSpend(0.6, SPORTS)).toBeCloseTo(0.02);
    expect(feeShareOfSpend(0.1, SPORTS)).toBeCloseTo(0.045);
  });

  it("is zero without fees or at invalid prices", () => {
    expect(feeShareOfSpend(0.6, null)).toBe(0);
    expect(feeShareOfSpend(0, SPORTS)).toBe(0);
  });
});

describe("maxSpendAfterFees", () => {
  it("leaves room for the fee plus a small margin, rounded down to the cent", () => {
    const spend = maxSpendAfterFees(114_766.13, 0.6, SPORTS);
    expect(spend * (1 + feeShareOfSpend(0.6, SPORTS))).toBeLessThan(114_766.13);
    expect(spend).toBe(Math.floor(spend * 100) / 100);
    expect(spend).toBeGreaterThan(111_500);
  });

  it("spends the whole balance (minus margin) when there is no fee", () => {
    expect(maxSpendAfterFees(100, 0.6, null)).toBeCloseTo(99.5, 2);
  });
});
