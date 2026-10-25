import { afterEach, describe, expect, it, vi } from "vitest";

const getEvents = vi.hoisted(() => vi.fn());
vi.mock("@/lib/polymarket/gamma", () => ({ getEvents }));

import { GET } from "./route";
import { normalizeEvent } from "@/lib/polymarket/normalize";

const request = (qs: string) => new Request(`http://localhost/api/events?${qs}`);

afterEach(() => {
  getEvents.mockReset();
  vi.restoreAllMocks();
});

describe("GET /api/events", () => {
  it("returns the next page for a group subgroup with the resolved filter", async () => {
    getEvents.mockResolvedValue({ events: [normalizeEvent({ id: "e1", title: "Game" })], nextCursor: "c3" });
    const res = await GET(request("group=sports&sub=live&cursor=c2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.nextCursor).toBe("c3");
    expect(body.data.events[0].id).toBe("e1");
    expect(getEvents).toHaveBeenCalledWith({ sort: "trending", tag: "", cursor: "c2" }, { kind: "live" });
  });

  it("passes home tag and sort through without a filter", async () => {
    getEvents.mockResolvedValue({ events: [], nextCursor: null });
    await GET(request("sort=volume&tag=crypto&cursor=c1"));
    expect(getEvents).toHaveBeenCalledWith({ sort: "volume", tag: "crypto", cursor: "c1" }, undefined);
  });

  it("rejects requests without a cursor", async () => {
    const res = await GET(request("group=sports"));
    expect(res.status).toBe(400);
    expect(getEvents).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown groups", async () => {
    const res = await GET(request("group=nope&cursor=c1"));
    expect(res.status).toBe(404);
  });

  it("returns 502 with an error envelope when Polymarket fails", async () => {
    getEvents.mockRejectedValue(new Error("timeout"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(request("cursor=c1"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ success: false, data: null, error: "Could not load more markets." });
  });
});
