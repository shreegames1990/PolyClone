import { describe, expect, it } from "vitest";
import { eventsPageUrl, mergeEventPages, parseEventPageRequest, resolvePageFilter } from "./event-pages";
import { normalizeEvent } from "./normalize";

describe("eventsPageUrl", () => {
  it("encodes a group page query with its cursor", () => {
    expect(eventsPageUrl({ group: "sports", sub: "live", sort: "trending", tag: "" }, "c2")).toBe(
      "/api/events?group=sports&sub=live&cursor=c2",
    );
  });

  it("encodes home queries with non-default sort and tag", () => {
    expect(eventsPageUrl({ sort: "volume", tag: "crypto" }, "abc")).toBe("/api/events?sort=volume&tag=crypto&cursor=abc");
  });
});

describe("parseEventPageRequest", () => {
  it("round-trips what eventsPageUrl produces", () => {
    const url = new URL(eventsPageUrl({ group: "sports", sub: "la-liga", sort: "new", tag: "" }, "c9"), "http://x");
    expect(parseEventPageRequest(url.searchParams)).toEqual({
      query: { group: "sports", sub: "la-liga", sort: "new", tag: "" },
      cursor: "c9",
    });
  });

  it("requires a valid cursor and well-formed slugs", () => {
    expect(parseEventPageRequest(new URLSearchParams("group=sports"))).toBeNull();
    expect(parseEventPageRequest(new URLSearchParams("cursor=c1&group=Bad Group!"))).toBeNull();
    expect(parseEventPageRequest(new URLSearchParams("cursor=c1&sub=live"))).toBeNull();
  });

  it("falls back to trending for unknown sorts", () => {
    expect(parseEventPageRequest(new URLSearchParams("cursor=c1&sort=weird"))?.query.sort).toBe("trending");
  });
});

describe("resolvePageFilter", () => {
  it("resolves group subgroups to their event filter", () => {
    expect(resolvePageFilter({ group: "sports", sub: "live", sort: "trending", tag: "" })).toEqual({ filter: { kind: "live" } });
    expect(resolvePageFilter({ group: "sports", sort: "trending", tag: "" })).toEqual({ filter: { kind: "tag", tagId: "1" } });
  });

  it("leaves home queries unfiltered (tag slug handled by the browse params)", () => {
    expect(resolvePageFilter({ sort: "trending", tag: "crypto" })).toEqual({ filter: undefined });
  });

  it("rejects unknown groups and subgroups", () => {
    expect(resolvePageFilter({ group: "nope", sort: "trending", tag: "" })).toBeNull();
    expect(resolvePageFilter({ group: "sports", sub: "curling", sort: "trending", tag: "" })).toBeNull();
  });
});

describe("mergeEventPages", () => {
  it("appends new events and skips ones already shown", () => {
    const a = normalizeEvent({ id: "a" });
    const b = normalizeEvent({ id: "b" });
    const c = normalizeEvent({ id: "c" });
    expect(mergeEventPages([a, b], [b, c]).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});
