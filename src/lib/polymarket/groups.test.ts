import { describe, expect, it } from "vitest";
import {
  activeSportsPath,
  findGroup,
  GROUPS,
  parseRelatedTags,
  resolveSubgroup,
  SPORTS_SIDEBAR,
  subgroupHref,
} from "./groups";

describe("GROUPS", () => {
  it("has unique, URL-safe slugs and numeric tag ids", () => {
    const slugs = GROUPS.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GROUPS) {
      expect(g.slug).toMatch(/^[a-z-]+$/);
      expect(g.tagId).toMatch(/^\d+$/);
    }
  });

  it("uses the pop-culture tag for Culture", () => {
    expect(findGroup("culture")?.tagId).toBe("596");
  });

  it("finds groups by slug and rejects unknown ones", () => {
    expect(findGroup("sports")?.label).toBe("Sports");
    expect(findGroup("nope")).toBeNull();
  });
});

describe("SPORTS_SIDEBAR", () => {
  it("has unique subgroup slugs across all levels", () => {
    const slugs = [...SPORTS_SIDEBAR.top, ...SPORTS_SIDEBAR.sports.flatMap((n) => [n, ...(n.children ?? [])])]
      .filter((n) => !n.children)
      .map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("nests leagues under Soccer with an All entry first", () => {
    const soccer = SPORTS_SIDEBAR.sports.find((n) => n.label === "Soccer");
    expect(soccer?.children?.[0]).toMatchObject({ slug: "soccer", label: "All", tagId: "100350" });
    expect(soccer?.children?.map((c) => c.slug)).toContain("la-liga");
  });
});

describe("resolveSubgroup", () => {
  const sports = findGroup("sports")!;
  const politics = findGroup("politics")!;

  it("returns the group's own tag for the group root", () => {
    expect(resolveSubgroup(sports, undefined)).toEqual({ label: "Sports", filter: { kind: "tag", tagId: "1" } });
  });

  it("resolves curated sports subgroups, including nested leagues and Live/Futures", () => {
    expect(resolveSubgroup(sports, "la-liga")).toEqual({ label: "LaLiga", filter: { kind: "tag", tagId: "780" } });
    expect(resolveSubgroup(sports, "live")?.filter).toEqual({ kind: "live" });
    expect(resolveSubgroup(sports, "futures")?.filter).toEqual({ kind: "futures" });
  });

  it("rejects unknown sports subgroups", () => {
    expect(resolveSubgroup(sports, "curling")).toBeNull();
  });

  it("maps other groups' subgroups to tag slugs, labelled from related tags when known", () => {
    const related = [{ id: "126", slug: "trump", label: "Trump" }];
    expect(resolveSubgroup(politics, "trump", related)).toEqual({ label: "Trump", filter: { kind: "slug", slug: "trump" } });
    expect(resolveSubgroup(politics, "gov-shutdown")).toEqual({ label: "Gov Shutdown", filter: { kind: "slug", slug: "gov-shutdown" } });
  });

  it("rejects malformed subgroup slugs", () => {
    expect(resolveSubgroup(politics, "Bad Slug!")).toBeNull();
  });
});

describe("league icons", () => {
  it("resolves league-icons/ paths and bucket-root paths", () => {
    const leaves = SPORTS_SIDEBAR.sports.flatMap((n) => n.children ?? [n]);
    expect(leaves.find((n) => n.slug === "la-liga")?.icon).toBe(
      "https://polymarket-upload.s3.us-east-2.amazonaws.com/league-icons/lal-33aa3578.png",
    );
    expect(leaves.find((n) => n.slug === "dota-2")?.icon).toBe(
      "https://polymarket-upload.s3.us-east-2.amazonaws.com/dota2-1d288592aa.png",
    );
  });
});

describe("subgroupHref", () => {
  it("builds group and subgroup paths", () => {
    expect(subgroupHref("sports")).toBe("/sports");
    expect(subgroupHref("sports", "la-liga")).toBe("/sports/la-liga");
  });
});

describe("activeSportsPath", () => {
  it("picks the most specific sidebar entry matching an event's tags", () => {
    expect(activeSportsPath(["1", "100350", "780", "100639"])).toBe("la-liga");
    expect(activeSportsPath(["1", "100350"])).toBe("soccer");
    expect(activeSportsPath(["1", "100977", "1234", "100350"])).toBe("ucl");
    expect(activeSportsPath(["2"])).toBeNull();
  });
});

describe("parseRelatedTags", () => {
  it("keeps tags with a slug and label and drops the rest", () => {
    expect(
      parseRelatedTags([
        { id: 126, slug: "trump", label: "Trump" },
        { id: 1, slug: "", label: "x" },
        "junk",
      ]),
    ).toEqual([{ id: "126", slug: "trump", label: "Trump" }]);
    expect(parseRelatedTags({ not: "an array" })).toEqual([]);
  });
});
