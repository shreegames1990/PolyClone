import { describe, expect, it } from "vitest";
import {
  formatCents,
  formatCompactUsd,
  formatPercent,
  formatSignedPercent,
  formatUsd,
  shortAddress,
  formatEndDate,
} from "./format";

describe("formatCompactUsd", () => {
  it("formats large values with suffixes", () => {
    expect(formatCompactUsd(1_234_567)).toBe("$1.2M");
    expect(formatCompactUsd(12_500)).toBe("$12.5K");
    expect(formatCompactUsd(999)).toBe("$999");
  });

  it("treats invalid input as zero", () => {
    expect(formatCompactUsd(Number.NaN)).toBe("$0");
    expect(formatCompactUsd(undefined)).toBe("$0");
  });
});

describe("formatUsd", () => {
  it("formats with two decimals", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(-3.456)).toBe("-$3.46");
  });
});

describe("formatPercent", () => {
  it("converts probability to whole percent", () => {
    expect(formatPercent(0.537)).toBe("54%");
    expect(formatPercent(0.004)).toBe("<1%");
    expect(formatPercent(0.996)).toBe(">99%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatSignedPercent", () => {
  it("adds a sign", () => {
    expect(formatSignedPercent(0.052)).toBe("+5.2%");
    expect(formatSignedPercent(-0.1)).toBe("-10.0%");
  });
});

describe("formatCents", () => {
  it("shows price in cents", () => {
    expect(formatCents(0.535)).toBe("53.5¢");
    expect(formatCents(0.5)).toBe("50¢");
  });
});

describe("shortAddress", () => {
  it("truncates an address", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678",
    );
  });
});

describe("formatEndDate", () => {
  it("formats an ISO date", () => {
    expect(formatEndDate("2026-11-03T00:00:00Z")).toBe("Nov 3, 2026");
  });

  it("returns empty string for invalid input", () => {
    expect(formatEndDate("nope")).toBe("");
    expect(formatEndDate(undefined)).toBe("");
  });
});
