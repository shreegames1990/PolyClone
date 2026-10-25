import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit per key within a window, then blocks", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 10)).toBe(true);
    expect(limiter.allow("a", 20)).toBe(false);
    expect(limiter.allow("b", 20)).toBe(true);
  });

  it("starts a fresh window after windowMs", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 999)).toBe(false);
    expect(limiter.allow("a", 1000)).toBe(true);
  });

  it("forgets expired keys so memory stays bounded", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.allow("a", 0);
    limiter.allow("b", 0);
    limiter.allow("c", 5000);
    expect(limiter.size()).toBe(1);
  });
});
