import { describe, expect, it } from "vitest";
import { groupLiveEvents } from "./live-groups";
import { normalizeEvent } from "./normalize";

const ev = (id: string, tagIds: string[], endDate: string) =>
  normalizeEvent({ id, endDate, tags: tagIds.map((t) => ({ id: t, label: `t${t}`, slug: `t${t}` })) });

describe("groupLiveEvents", () => {
  it("groups by the most specific sports entry, in sidebar order, with Other last", () => {
    const groups = groupLiveEvents([
      ev("liga", ["1", "100350", "780"], "2026-10-26T20:00:00Z"),
      ev("nfl", ["1", "450"], "2026-10-26T21:00:00Z"),
      ev("misc", ["1"], "2026-10-26T22:00:00Z"),
      ev("soccer", ["1", "100350"], "2026-10-26T19:00:00Z"),
    ]);
    expect(groups.map((g) => [g.label, g.events.map((e) => e.id)])).toEqual([
      ["NFL", ["nfl"]],
      ["Soccer", ["soccer"]],
      ["LaLiga", ["liga"]],
      ["Other", ["misc"]],
    ]);
  });

  it("sorts each group by end time, latest first, with missing dates last", () => {
    const [nfl] = groupLiveEvents([
      ev("early", ["450"], "2026-10-26T18:00:00Z"),
      ev("none", ["450"], ""),
      ev("late", ["450"], "2026-10-26T23:00:00Z"),
    ]);
    expect(nfl?.events.map((e) => e.id)).toEqual(["late", "early", "none"]);
  });

  it("carries the sidebar node so the header can show the league icon", () => {
    const [liga] = groupLiveEvents([ev("liga", ["780"], "2026-10-26T20:00:00Z")]);
    expect(liga?.key).toBe("la-liga");
    expect(liga?.node?.icon).toContain("lal-");
  });

  it("returns no groups for no events", () => {
    expect(groupLiveEvents([])).toEqual([]);
  });
});
