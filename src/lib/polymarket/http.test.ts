import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, UpstreamError } from "./http";
import { GET } from "@/app/api/pm/[service]/[...path]/route";

afterEach(() => vi.unstubAllGlobals());

const ctx = (service: string, path: string[]) => ({ params: Promise.resolve({ service, path }) });

describe("fetchJson", () => {
  it("returns parsed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"a":1}', { status: 200 })));
    expect(await fetchJson("https://x.test")).toEqual({ a: 1 });
  });

  it("throws UpstreamError with the status on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    await expect(fetchJson("https://x.test")).rejects.toMatchObject({ name: "UpstreamError", status: 429 });
  });

  it("throws a 502 UpstreamError when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const error = await fetchJson("https://x.test").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(502);
  });
});

describe("GET /api/pm/[service]/[...path]", () => {
  it("proxies allowlisted requests with CDN caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[1]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(new Request("http://localhost/api/pm/clob/book?token_id=1"), ctx("clob", ["book"]));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([1]);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://clob.polymarket.com/book?token_id=1");
  });

  it("rejects non-allowlisted paths without calling upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(new Request("http://localhost/api/pm/clob/order"), ctx("clob", ["order"]));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error envelope when upstream fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(new Request("http://localhost/api/pm/gamma/events"), ctx("gamma", ["events"]));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ success: false, data: null, error: "Could not load data from Polymarket." });
  });
});
