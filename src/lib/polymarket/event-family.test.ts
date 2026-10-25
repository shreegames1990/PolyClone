import { describe, expect, it } from "vitest";
import {
  byVolume24hrDesc,
  buildEventLookupQuery,
  buildGameTabs,
  childEventLabel,
  hasSportsMarkets,
  isChildEvent,
  withoutChildEvents,
} from "./event-family";
import { normalizeEvent } from "./normalize";

const GAME = "Club Atlético de Madrid vs. RC Deportivo A Coruña";

describe("normalizeEvent parentEventId", () => {
  it("keeps Gamma's parentEventId as a string and defaults to empty", () => {
    expect(normalizeEvent({ id: "2", parentEventId: 1169114 }).parentEventId).toBe("1169114");
    expect(normalizeEvent({ id: "2", parentEventId: "1169114" }).parentEventId).toBe("1169114");
    expect(normalizeEvent({ id: "1" }).parentEventId).toBe("");
    expect(normalizeEvent({ id: "1", parentEventId: null }).parentEventId).toBe("");
  });
});

describe("child events", () => {
  const main = normalizeEvent({ id: "1", slug: "game", title: GAME });
  const child = normalizeEvent({ id: "2", slug: "game-more-markets", title: `${GAME} - More Markets`, parentEventId: "1" });

  it("detects child events", () => {
    expect(isChildEvent(main)).toBe(false);
    expect(isChildEvent(child)).toBe(true);
  });

  it("drops child events from browse lists", () => {
    expect(withoutChildEvents([child, main]).map((e) => e.slug)).toEqual(["game"]);
  });
});

describe("childEventLabel", () => {
  it("strips the parent title prefix", () => {
    expect(childEventLabel(`${GAME} - Halftime Result`, GAME)).toBe("Halftime Result");
  });

  it("falls back to the text after the last dash", () => {
    expect(childEventLabel("Other Title - Player Props", GAME)).toBe("Player Props");
  });

  it("returns the whole title when there is no dash", () => {
    expect(childEventLabel("Exact Score", GAME)).toBe("Exact Score");
  });
});

describe("hasSportsMarkets", () => {
  it("is true only when a market has a sportsMarketType", () => {
    expect(hasSportsMarkets(normalizeEvent({ id: "1", markets: [{ id: "m", sportsMarketType: "moneyline" }] }))).toBe(true);
    expect(hasSportsMarkets(normalizeEvent({ id: "1", markets: [{ id: "m" }] }))).toBe(false);
  });
});

describe("buildEventLookupQuery", () => {
  it("includes closed events of both versions with the given filter", () => {
    const q = new URLSearchParams(buildEventLookupQuery({ parent_event_id: "1169114" }, 100));
    expect(q.get("parent_event_id")).toBe("1169114");
    expect(q.get("closed")).toBe("any");
    expect(q.get("limit")).toBe("100");
    expect(q.getAll("version")).toEqual(["v1", "v2"]);
  });
});

describe("buildGameTabs", () => {
  const main = normalizeEvent({ id: "1", slug: "game", title: GAME });
  const children = [
    normalizeEvent({ id: "2", slug: "game-exact-score", title: `${GAME} - Exact Score`, parentEventId: "1" }),
    normalizeEvent({ id: "3", slug: "game-more-markets", title: `${GAME} - More Markets`, parentEventId: "1" }),
  ];

  it("lists the main game first, then its children", () => {
    expect(buildGameTabs(main, children)).toEqual([
      { slug: "game", label: "Game Lines" },
      { slug: "game-exact-score", label: "Exact Score" },
      { slug: "game-more-markets", label: "More Markets" },
    ]);
  });

  it("returns no tabs when the game has no children", () => {
    expect(buildGameTabs(main, [])).toEqual([]);
  });
});

describe("byVolume24hrDesc", () => {
  it("orders events by 24h volume, highest first, without mutating the input", () => {
    const events = [
      normalizeEvent({ id: "a", volume24hr: 5 }),
      normalizeEvent({ id: "b", volume24hr: 50 }),
      normalizeEvent({ id: "c", volume24hr: 20 }),
    ];
    expect(byVolume24hrDesc(events).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(events.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});
