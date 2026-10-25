import { describe, expect, it } from "vitest";
import { buildEventPositions } from "./event-positions";
import { normalizeEvent } from "./normalize";
import type { Position } from "./data-api";

const HOME = "Athletic Club";
const AWAY = "Getafe CF";

const event = normalizeEvent({
  id: "1",
  teams: [
    { name: HOME, abbreviation: "bil", color: "#c8102e" },
    { name: AWAY, abbreviation: "get", color: "#004fa3" },
  ],
  markets: [
    { id: "h", groupItemTitle: HOME, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["h-yes","h-no"]' },
    { id: "d", groupItemTitle: `Draw (${HOME} vs. ${AWAY})`, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["d-yes","d-no"]' },
    { id: "a", groupItemTitle: AWAY, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["a-yes","a-no"]' },
    { id: "s", groupItemTitle: "Spread -1.5", sportsMarketType: "spreads", outcomes: `["${HOME}","${AWAY}"]`, clobTokenIds: '["s-1","s-2"]' },
  ],
});

const position = (tokenId: string, overrides: Partial<Position> = {}): Position => ({
  tokenId,
  title: "",
  icon: "",
  eventSlug: "",
  outcome: "Yes",
  size: 3112,
  avgPrice: 0.95,
  curPrice: 0.999,
  cost: 2956.46,
  value: 3108.89,
  pnl: 152.43,
  percentPnl: 5.2,
  redeemable: false,
  endDate: "",
  ...overrides,
});

describe("buildEventPositions", () => {
  it("keeps only positions in this event's markets, with market and outcome index", () => {
    const rows = buildEventPositions(event, [position("h-yes"), position("other-token"), position("s-2", { outcome: AWAY })]);
    expect(rows.map((r) => [r.marketId, r.outcomeIndex])).toEqual([
      ["h", 0],
      ["s", 1],
    ]);
  });

  it("labels moneyline positions with the team abbreviation and color", () => {
    const [row] = buildEventPositions(event, [position("h-yes")]);
    expect(row).toMatchObject({ type: "Moneyline", outcome: "BIL YES", color: "#c8102e", toWin: 3112 });
  });

  it("labels the draw and No outcomes", () => {
    const [row] = buildEventPositions(event, [position("d-no", { outcome: "No" })]);
    expect(row).toMatchObject({ type: "Moneyline", outcome: "DRAW NO", color: null });
  });

  it("labels other sports markets by market type and outcome name", () => {
    const [row] = buildEventPositions(event, [position("s-2", { outcome: AWAY })]);
    expect(row).toMatchObject({ type: "Spread -1.5", outcome: "GETAFE CF", color: null });
  });

  it("uses the market label as the type for non-sports events and drops empty positions", () => {
    const multi = normalizeEvent({
      id: "2",
      markets: [{ id: "m", groupItemTitle: "Harry Kane", outcomes: '["Yes","No"]', clobTokenIds: '["k-yes","k-no"]' }],
    });
    const rows = buildEventPositions(multi, [position("k-no", { outcome: "No" }), position("k-yes", { size: 0 })]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "Harry Kane", outcome: "NO", outcomeIndex: 1 });
  });
});
