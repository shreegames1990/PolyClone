import { describe, expect, it } from "vitest";
import { defaultLimitCents } from "./limit-default";

describe("defaultLimitCents", () => {
  it("prefills the outcome price in cents, rounded to the tick", () => {
    expect(defaultLimitCents(0.616, "0.01")).toBe("62");
    expect(defaultLimitCents(0.6153, "0.001")).toBe("61.5");
  });

  it("keeps the prefill inside the tradable range (one tick from 0¢ and 100¢)", () => {
    expect(defaultLimitCents(0.9995, "0.01")).toBe("99");
    expect(defaultLimitCents(0.0004, "0.01")).toBe("1");
    expect(defaultLimitCents(0.99995, "0.001")).toBe("99.9");
  });

  it("returns empty for missing or out-of-range prices", () => {
    expect(defaultLimitCents(undefined, "0.01")).toBe("");
    expect(defaultLimitCents(0, "0.01")).toBe("");
    expect(defaultLimitCents(1, "0.01")).toBe("");
  });
});
