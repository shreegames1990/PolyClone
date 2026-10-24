import { describe, expect, it } from "vitest";
import { browseHref, buildEventsQuery, parseBrowseParams, SORT_OPTIONS } from "./queries";

const NOW = Date.UTC(2026, 9, 19, 21, 37, 12);

describe("parseBrowseParams", () => {
  it("defaults to trending, all categories, first page", () => {
    expect(parseBrowseParams({})).toEqual({ sort: "trending", tag: "", cursor: "" });
  });

  it("accepts valid values", () => {
    expect(parseBrowseParams({ sort: "new", tag: "politics", cursor: "abc_123=" })).toEqual({
      sort: "new",
      tag: "politics",
      cursor: "abc_123=",
    });
  });

  it("rejects invalid values", () => {
    expect(parseBrowseParams({ sort: "drop table", tag: "../x", cursor: "a b<script>" })).toEqual({
      sort: "trending",
      tag: "",
      cursor: "",
    });
  });

  it("takes the first value of array params", () => {
    expect(parseBrowseParams({ sort: ["liquidity", "new"] }).sort).toBe("liquidity");
  });
});

describe("buildEventsQuery", () => {
  it("builds a trending keyset query for v1 and v2 markets", () => {
    const q = new URLSearchParams(buildEventsQuery({ sort: "trending", tag: "", cursor: "" }, NOW));
    expect(q.get("order")).toBe("volume24hr");
    expect(q.get("ascending")).toBe("false");
    expect(q.get("closed")).toBe("false");
    expect(q.getAll("version")).toEqual(["v1", "v2"]);
    expect(q.has("after_cursor")).toBe(false);
    expect(q.has("offset")).toBe(false);
    expect(q.has("tag_slug")).toBe(false);
    expect(q.has("end_date_min")).toBe(false);
  });

  it("adds tag and cursor", () => {
    const q = new URLSearchParams(buildEventsQuery({ sort: "volume", tag: "crypto", cursor: "c1" }, NOW));
    expect(q.get("tag_slug")).toBe("crypto");
    expect(q.get("after_cursor")).toBe("c1");
    expect(q.get("order")).toBe(SORT_OPTIONS.volume.order);
  });

  it("limits 'ending soon' to future end dates rounded to the hour", () => {
    const q = new URLSearchParams(buildEventsQuery({ sort: "ending", tag: "", cursor: "" }, NOW));
    expect(q.get("ascending")).toBe("true");
    expect(q.get("end_date_min")).toBe("2026-10-19T21:00:00.000Z");
  });
});

describe("browseHref", () => {
  it("returns / for the default view", () => {
    expect(browseHref({})).toBe("/");
    expect(browseHref({ sort: "trending", tag: "", cursor: "" })).toBe("/");
  });

  it("encodes tag, non-default sort and cursor", () => {
    expect(browseHref({ tag: "sports" })).toBe("/?tag=sports");
    expect(browseHref({ sort: "new" })).toBe("/?sort=new");
    expect(browseHref({ tag: "crypto", sort: "volume", cursor: "abc" })).toBe("/?tag=crypto&sort=volume&cursor=abc");
  });
});
