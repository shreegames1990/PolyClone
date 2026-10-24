import { afterEach, describe, expect, it, vi } from "vitest";
import { viaRemoteProxy } from "./remote-proxy";
import { fetchJson } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const BASE = "https://clone.example.app";

describe("viaRemoteProxy", () => {
  it("leaves URLs unchanged when no proxy is configured", () => {
    expect(viaRemoteProxy("https://gamma-api.polymarket.com/events?limit=1", undefined)).toBe(
      "https://gamma-api.polymarket.com/events?limit=1",
    );
    expect(viaRemoteProxy("https://gamma-api.polymarket.com/events", "")).toBe("https://gamma-api.polymarket.com/events");
  });

  it.each([
    ["https://gamma-api.polymarket.com/events/keyset?limit=20", `${BASE}/api/pm/gamma/events/keyset?limit=20`],
    ["https://data-api.polymarket.com/v2/positions?user=0x1", `${BASE}/api/pm/data/v2/positions?user=0x1`],
    ["https://clob.polymarket.com/book?token_id=1", `${BASE}/api/pm/clob/book?token_id=1`],
  ])("routes %s through the remote proxy", (input, expected) => {
    expect(viaRemoteProxy(input, BASE)).toBe(expected);
  });

  it("tolerates a trailing slash on the proxy base", () => {
    expect(viaRemoteProxy("https://clob.polymarket.com/book", `${BASE}/`)).toBe(`${BASE}/api/pm/clob/book`);
  });

  it("leaves non-Polymarket URLs unchanged", () => {
    expect(viaRemoteProxy("https://other.test/x", BASE)).toBe("https://other.test/x");
  });

  it("rejects a malformed proxy base", () => {
    expect(() => viaRemoteProxy("https://clob.polymarket.com/book", "not a url")).toThrow(/PM_REMOTE_PROXY_URL/);
    expect(() => viaRemoteProxy("https://clob.polymarket.com/book", "ftp://x.test")).toThrow(/PM_REMOTE_PROXY_URL/);
  });
});

describe("fetchJson with PM_REMOTE_PROXY_URL", () => {
  it("fetches Polymarket URLs through the configured proxy", async () => {
    vi.stubEnv("PM_REMOTE_PROXY_URL", BASE);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchJson("https://gamma-api.polymarket.com/public-search?q=x");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${BASE}/api/pm/gamma/public-search?q=x`);
  });
});
