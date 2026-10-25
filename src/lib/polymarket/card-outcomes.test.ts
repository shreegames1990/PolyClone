import { describe, expect, it } from "vitest";
import { cardOutcomes } from "./card-outcomes";
import { normalizeEvent } from "./normalize";

const HOME = "Club Atlético de Madrid";
const AWAY = "RC Deportivo A Coruña";

describe("cardOutcomeButtons", () => {
  it("uses moneyline team abbreviations, DRAW, team colors and the best Yes bid for games", () => {
    const game = normalizeEvent({
      id: "1",
      teams: [
        { name: HOME, abbreviation: "mad", color: "#444488" },
        { name: AWAY, abbreviation: "dep", color: "#bca780" },
      ],
      markets: [
        { id: "h", groupItemTitle: HOME, sportsMarketType: "moneyline", bestBid: 0.74, outcomes: '["Yes","No"]', outcomePrices: '["0.75","0.25"]' },
        { id: "d", groupItemTitle: `Draw (${HOME} vs. ${AWAY})`, sportsMarketType: "moneyline", bestBid: 0.17, outcomes: '["Yes","No"]', outcomePrices: '["0.18","0.82"]' },
        { id: "a", groupItemTitle: AWAY, sportsMarketType: "moneyline", bestBid: 0.08, outcomes: '["Yes","No"]', outcomePrices: '["0.09","0.91"]' },
        { id: "s", groupItemTitle: "Spread -1.5", sportsMarketType: "spreads", bestBid: 0.5 },
      ],
    });
    expect(cardOutcomes(game)).toEqual({
      layout: "row",
      items: [
        { marketId: "h", label: "MAD", price: 0.74, color: "#444488", side: "yes" },
        { marketId: "d", label: "DRAW", price: 0.17, color: null, side: "yes" },
        { marketId: "a", label: "DEP", price: 0.08, color: "#bca780", side: "yes" },
      ],
    });
  });

  it("lists every open market, stacked, for events with more than three markets", () => {
    const fed = normalizeEvent({
      id: "2",
      markets: [
        { id: "a", groupItemTitle: "No change", bestBid: 0.94, outcomes: '["Yes","No"]', outcomePrices: '["0.95","0.05"]' },
        { id: "b", groupItemTitle: "25 bps increase", bestBid: 0.05, outcomes: '["Yes","No"]', outcomePrices: '["0.06","0.94"]' },
        { id: "c", groupItemTitle: "Closed", closed: true, outcomes: '["Yes","No"]', outcomePrices: '["0.99","0.01"]' },
        { id: "d", groupItemTitle: "50+ bps increase", bestBid: 0, outcomes: '["Yes","No"]', outcomePrices: '["0.01","0.99"]' },
        { id: "e", groupItemTitle: "Cut", bestBid: 0, outcomes: '["Yes","No"]', outcomePrices: '["0.005","0.995"]' },
      ],
    });
    expect(cardOutcomes(fed)).toEqual({
      layout: "list",
      items: [
        { marketId: "a", label: "No change", price: 0.94, color: null, side: "yes" },
        { marketId: "b", label: "25 bps increase", price: 0.05, color: null, side: "yes" },
        // No bid: fall back to the last Yes price.
        { marketId: "d", label: "50+ bps increase", price: 0.01, color: null, side: "yes" },
        { marketId: "e", label: "Cut", price: 0.005, color: null, side: "yes" },
      ],
    });
  });

  it("uses side-by-side buttons for events with up to three open markets", () => {
    const small = normalizeEvent({
      id: "5",
      markets: [
        { id: "x", groupItemTitle: "Yes outcome A", bestBid: 0.6, outcomes: '["Yes","No"]', outcomePrices: '["0.6","0.4"]' },
        { id: "y", groupItemTitle: "Outcome B", bestBid: 0.3, outcomes: '["Yes","No"]', outcomePrices: '["0.3","0.7"]' },
      ],
    });
    expect(cardOutcomes(small).layout).toBe("row");
    expect(cardOutcomes(small).items.map((i) => i.marketId)).toEqual(["x", "y"]);
  });

  it("splits a single two-team moneyline market into one button per team (NFL style)", () => {
    const nfl = normalizeEvent({
      id: "4",
      teams: [
        { name: "Cleveland Browns", abbreviation: "cle", alias: "Browns", color: "#311d00" },
        { name: "Tennessee Titans", abbreviation: "ten", alias: "Titans", color: "#0c2340" },
      ],
      markets: [
        { id: "ml", groupItemTitle: "Browns vs. Titans", sportsMarketType: "moneyline", outcomes: '["Browns","Titans"]', outcomePrices: '["0.515","0.485"]', bestBid: 0.51, bestAsk: 0.52 },
        { id: "ou", groupItemTitle: "O/U 34.5", sportsMarketType: "totals", outcomes: '["Over","Under"]', outcomePrices: '["0.98","0.02"]' },
      ],
    });
    expect(cardOutcomes(nfl)).toEqual({
      layout: "row",
      items: [
        { marketId: "ml", label: "CLE", price: 0.51, color: "#311d00", side: "yes" },
        // Second outcome's best bid is 1 - the first outcome's best ask.
        { marketId: "ml", label: "TEN", price: 0.48, color: "#0c2340", side: "no" },
      ],
    });
  });

  it("returns nothing for events without open markets", () => {
    expect(cardOutcomes(normalizeEvent({ id: "3" }))).toEqual({ layout: "row", items: [] });
  });
});
