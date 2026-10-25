import { describe, expect, it } from "vitest";
import { EXPIRY_OPTIONS, expirationFor, expiryLabel } from "./expiry";

// 2026-10-26 14:30:00 local time.
const NOW = new Date(2026, 9, 26, 14, 30, 0).getTime();
const seconds = (ms: number) => Math.floor(ms / 1000);

describe("expiry options", () => {
  it("offers Never first, then fixed and end-of-day expiries", () => {
    expect(EXPIRY_OPTIONS.map((o) => o.value)).toEqual(["never", "1h", "1d", "eod"]);
    expect(expiryLabel("never")).toBe("Never");
    expect(expiryLabel("eod")).toBe("End of day");
  });
});

describe("expirationFor", () => {
  it("returns undefined for good-till-cancelled orders", () => {
    expect(expirationFor("never", NOW)).toBeUndefined();
  });

  it("returns unix seconds for fixed durations", () => {
    expect(expirationFor("1h", NOW)).toBe(seconds(NOW) + 3600);
    expect(expirationFor("1d", NOW)).toBe(seconds(NOW) + 86_400);
  });

  it("returns local midnight for end of day", () => {
    expect(expirationFor("eod", NOW)).toBe(seconds(new Date(2026, 9, 27, 0, 0, 0).getTime()));
  });

  it("never returns less than the CLOB's 3-minute minimum plus a buffer", () => {
    const nearMidnight = new Date(2026, 9, 26, 23, 58, 30).getTime();
    expect(expirationFor("eod", nearMidnight)).toBeGreaterThanOrEqual(seconds(nearMidnight) + 4 * 60);
  });
});
