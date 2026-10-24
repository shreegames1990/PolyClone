import { describe, expect, it } from "vitest";
import { buildUpstreamUrl } from "./proxy";

describe("buildUpstreamUrl", () => {
  it("builds an allowlisted gamma URL with query", () => {
    const url = buildUpstreamUrl("gamma", ["events"], "?limit=10&closed=false");
    expect(url?.toString()).toBe(
      "https://gamma-api.polymarket.com/events?limit=10&closed=false",
    );
  });

  it("allows one trailing segment under an allowlisted prefix", () => {
    expect(buildUpstreamUrl("gamma", ["events", "slug", "my-event"], "")?.pathname).toBe(
      "/events/slug/my-event",
    );
  });

  it("allows Data API v2 routes but not retired v1 routes", () => {
    expect(buildUpstreamUrl("data", ["v2", "positions"], "?user=0x1")?.toString()).toBe(
      "https://data-api.polymarket.com/v2/positions?user=0x1",
    );
    expect(buildUpstreamUrl("data", ["positions"], "")).toBeNull();
  });

  it("clamps oversized or invalid limits", () => {
    expect(buildUpstreamUrl("gamma", ["events"], "?limit=100000")?.searchParams.get("limit")).toBe("100");
    expect(buildUpstreamUrl("gamma", ["events"], "?limit=abc")?.searchParams.get("limit")).toBe("100");
    expect(buildUpstreamUrl("gamma", ["events"], "?limit=20")?.searchParams.get("limit")).toBe("20");
  });

  it("rejects unknown services", () => {
    expect(buildUpstreamUrl("evil", ["events"], "")).toBeNull();
  });

  it("rejects paths outside the allowlist", () => {
    expect(buildUpstreamUrl("clob", ["order"], "")).toBeNull();
    expect(buildUpstreamUrl("clob", ["auth", "api-key"], "")).toBeNull();
  });

  it("rejects traversal and deep paths", () => {
    expect(buildUpstreamUrl("gamma", ["events", ".."], "")).toBeNull();
    expect(buildUpstreamUrl("gamma", ["events", "slug", "a", "b"], "")).toBeNull();
    expect(buildUpstreamUrl("gamma", ["events", "a%2Fb"], "")).toBeNull();
  });

  it("rejects empty paths", () => {
    expect(buildUpstreamUrl("gamma", [], "")).toBeNull();
  });
});
