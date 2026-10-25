import { describe, expect, it } from "vitest";
import { cardTeams, teamForSelection } from "./teams";
import { normalizeEvent } from "./normalize";

const HOME = "Club Atlético de Madrid";
const AWAY = "RC Deportivo A Coruña";

const game = normalizeEvent({
  id: "1",
  icon: "https://x.test/laliga.png",
  teams: [
    { name: HOME, abbreviation: "mad", color: "#444488", logo: "https://x.test/Club Atlético de Madrid-285b.png" },
    { name: AWAY, abbreviation: "dep", color: "#bca780", logo: "https://x.test/dep.png" },
  ],
  markets: [
    { id: "h", groupItemTitle: HOME, sportsMarketType: "moneyline" },
    { id: "d", groupItemTitle: `Draw (${HOME} vs. ${AWAY})`, sportsMarketType: "moneyline" },
    { id: "s", groupItemTitle: "Spread -1.5", sportsMarketType: "spreads" },
  ],
});

describe("normalized team logos", () => {
  it("percent-encodes spaces in Gamma logo URLs", () => {
    expect(game.teams[0]?.logo).toBe("https://x.test/Club%20Atl%C3%A9tico%20de%20Madrid-285b.png");
  });
});

describe("cardTeams", () => {
  it("returns the two teams when both have logos", () => {
    expect(cardTeams(game).map((t) => t.abbreviation)).toEqual(["mad", "dep"]);
  });

  it("returns nothing unless two teams have logos", () => {
    const oneLogo = normalizeEvent({ id: "2", teams: [{ name: "A", logo: "https://x.test/a.png" }, { name: "B", logo: "" }] });
    expect(cardTeams(oneLogo)).toEqual([]);
    expect(cardTeams(normalizeEvent({ id: "3" }))).toEqual([]);
  });
});

describe("teamForSelection", () => {
  it("finds the team whose moneyline market is selected", () => {
    const market = game.markets.find((m) => m.id === "h")!;
    expect(teamForSelection(game, market, "Yes")?.abbreviation).toBe("mad");
  });

  it("finds the team named by the selected outcome in a single two-team market", () => {
    const nfl = normalizeEvent({
      id: "4",
      teams: [
        { name: "Cleveland Browns", abbreviation: "cle", alias: "Browns" },
        { name: "Tennessee Titans", abbreviation: "ten", alias: "Titans" },
      ],
      markets: [{ id: "ml", groupItemTitle: "Browns vs. Titans", sportsMarketType: "moneyline", outcomes: '["Browns","Titans"]' }],
    });
    expect(teamForSelection(nfl, nfl.markets[0]!, "Titans")?.abbreviation).toBe("ten");
  });

  it("returns undefined for the draw and non-team markets", () => {
    expect(teamForSelection(game, game.markets.find((m) => m.id === "d")!, "Yes")).toBeUndefined();
    expect(teamForSelection(game, game.markets.find((m) => m.id === "s")!, "Yes")).toBeUndefined();
  });
});
