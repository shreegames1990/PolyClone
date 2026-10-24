import { describe, expect, it } from "vitest";
import { INTERVALS, mergeSeries, parsePriceHistory } from "./price-history";

describe("parsePriceHistory", () => {
  it("parses points and converts seconds to ms", () => {
    expect(parsePriceHistory({ history: [{ t: 10, p: 0.5 }, { t: 20, p: "0.6" }] })).toEqual([
      { t: 10_000, p: 0.5 },
      { t: 20_000, p: 0.6 },
    ]);
  });

  it("drops bad points and handles garbage", () => {
    expect(parsePriceHistory({ history: [{ t: "x", p: 1 }] })).toEqual([]);
    expect(parsePriceHistory(null)).toEqual([]);
  });
});

describe("mergeSeries", () => {
  it("merges series by timestamp", () => {
    const merged = mergeSeries([
      { key: "a", points: [{ t: 1, p: 0.1 }, { t: 2, p: 0.2 }] },
      { key: "b", points: [{ t: 2, p: 0.9 }] },
    ]);
    expect(merged).toEqual([
      { t: 1, a: 0.1 },
      { t: 2, a: 0.2, b: 0.9 },
    ]);
  });
});

describe("INTERVALS", () => {
  it("has a fidelity for each interval", () => {
    for (const i of INTERVALS) expect(i.fidelity).toBeGreaterThan(0);
  });
});
