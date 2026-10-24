import { describe, expect, it } from "vitest";
import { buildMoneylineOptions } from "./moneyline";
import { normalizeEvent } from "./normalize";

const HOME = "Club Atlético de Madrid";
const AWAY = "RC Deportivo A Coruña";

const raw = {
  id: "1",
  teams: [
    { name: HOME, abbreviation: "mad", color: "#444488", logo: "https://x.test/mad.png", alias: "Atlético" },
    { name: AWAY, abbreviation: "dep", color: "#bca780", logo: "" },
  ],
  markets: [
    { id: "h", groupItemTitle: HOME, sportsMarketType: "moneyline", outcomePrices: '["0.71","0.29"]', outcomes: '["Yes","No"]' },
    { id: "d", groupItemTitle: `Draw (${HOME} vs. ${AWAY})`, sportsMarketType: "moneyline", outcomePrices: '["0.2","0.8"]', outcomes: '["Yes","No"]' },
    { id: "a", groupItemTitle: AWAY, sportsMarketType: "moneyline", outcomePrices: '["0.11","0.89"]', outcomes: '["Yes","No"]' },
    { id: "s", groupItemTitle: "Spread -1.5", sportsMarketType: "spreads" },
  ],
};

describe("normalizeEvent teams", () => {
  it("keeps team names, abbreviations, colors and logos", () => {
    const e = normalizeEvent(raw);
    expect(e.teams[0]).toEqual({ name: HOME, abbreviation: "mad", color: "#444488", logo: "https://x.test/mad.png" });
    expect(normalizeEvent({ id: "2" }).teams).toEqual([]);
  });
});

describe("buildMoneylineOptions", () => {
  it("labels moneyline markets with team abbreviations and DRAW, in market order", () => {
    expect(buildMoneylineOptions(normalizeEvent(raw))).toEqual([
      { marketId: "h", label: "MAD", color: "#444488", price: 0.71 },
      { marketId: "d", label: "DRAW", color: null, price: 0.2 },
      { marketId: "a", label: "DEP", color: "#bca780", price: 0.11 },
    ]);
  });

  it("falls back to the market label when no team matches", () => {
    const e = normalizeEvent({ ...raw, teams: [] });
    expect(buildMoneylineOptions(e).map((o) => o.label)).toEqual([HOME, "DRAW", AWAY]);
  });

  it("returns no options when the event has fewer than two moneyline markets", () => {
    expect(buildMoneylineOptions(normalizeEvent({ id: "3", markets: [raw.markets[0]] }))).toEqual([]);
  });
});
