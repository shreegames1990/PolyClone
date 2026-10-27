import { describe, expect, it } from "vitest";
import { clockLabel, isSoccerEvent, parseSportResult, scoreline } from "./live-score";
import { normalizeEvent } from "./normalize";
import type { GameState } from "./types";

const state = (overrides: Partial<GameState> = {}): GameState => ({
  live: true,
  ended: false,
  score: "2-1",
  period: "2H",
  elapsed: "67",
  ...overrides,
});

const soccerGame = (overrides: Record<string, unknown> = {}) =>
  normalizeEvent({
    id: "1",
    title: "Arsenal vs. Chelsea",
    tags: [{ id: "306", label: "EPL", slug: "epl" }],
    teams: [
      { name: "Chelsea", abbreviation: "che", logo: "https://x.test/che.png" },
      { name: "Arsenal", abbreviation: "ars", logo: "https://x.test/ars.png" },
    ],
    gameId: 9001,
    homeTeamName: "Arsenal",
    awayTeamName: "Chelsea",
    live: true,
    score: "2-1",
    period: "2H",
    elapsed: "67",
    ...overrides,
  });

describe("isSoccerEvent", () => {
  const withTag = (id: string) => normalizeEvent({ tags: [{ id, label: "x", slug: "x" }] });

  it("matches the generic soccer tag, soccer leagues, and top-level UEFA competitions", () => {
    expect(isSoccerEvent(withTag("100350"))).toBe(true);
    expect(isSoccerEvent(withTag("306"))).toBe(true);
    expect(isSoccerEvent(withTag("1234"))).toBe(true);
    expect(isSoccerEvent(withTag("100816"))).toBe(true);
  });

  it("does not match other sports", () => {
    expect(isSoccerEvent(withTag("745"))).toBe(false);
    expect(isSoccerEvent(normalizeEvent({}))).toBe(false);
  });
});

describe("parseSportResult", () => {
  it("reads a sports socket frame", () => {
    expect(
      parseSportResult({ gameId: 9001, leagueAbbreviation: "epl", status: "InProgress", live: true, ended: false, score: "3-1", period: "2H", elapsed: "80" }),
    ).toEqual({ gameId: 9001, state: state({ score: "3-1", elapsed: "80" }) });
  });

  it("defaults a missing period and elapsed time to empty strings", () => {
    expect(parseSportResult({ gameId: 1, live: false, ended: true, score: "0-0", period: null })?.state).toEqual(
      state({ live: false, ended: true, score: "0-0", period: "", elapsed: "" }),
    );
  });

  it("rejects frames without a game id or score", () => {
    expect(parseSportResult({ live: true, score: "1-0" })).toBeNull();
    expect(parseSportResult({ gameId: 1, live: true })).toBeNull();
    expect(parseSportResult("pong")).toBeNull();
  });
});

describe("clockLabel", () => {
  it("shows the period and minute while live", () => {
    expect(clockLabel(state())).toBe("2H · 67'");
    expect(clockLabel(state({ elapsed: "" }))).toBe("2H");
    expect(clockLabel(state({ period: "", elapsed: "12" }))).toBe("12'");
  });

  it("shows half time and full time", () => {
    expect(clockLabel(state({ period: "HT", elapsed: "45" }))).toBe("HT");
    expect(clockLabel(state({ live: false, ended: true }))).toBe("FT");
  });

  it("is empty before kick-off", () => {
    expect(clockLabel(state({ live: false }))).toBe("");
  });
});

describe("scoreline", () => {
  it("puts the home team first, matched by name", () => {
    const event = soccerGame();
    expect(scoreline(event, state())).toEqual({ home: "ARS", away: "CHE", homeScore: "2", awayScore: "1" });
  });

  it("accepts spaced scores", () => {
    expect(scoreline(soccerGame(), state({ score: " 0 - 3 " }))).toMatchObject({ homeScore: "0", awayScore: "3" });
  });

  it("falls back to the teams order and full names without abbreviations", () => {
    const event = soccerGame({
      homeTeamName: "",
      awayTeamName: "",
      teams: [
        { name: "Home FC", logo: "https://x.test/h.png" },
        { name: "Away FC", logo: "https://x.test/a.png" },
      ],
    });
    expect(scoreline(event, state())).toMatchObject({ home: "Home FC", away: "Away FC" });
  });

  it("is null for a score that is not two numbers or a game without two teams", () => {
    expect(scoreline(soccerGame(), state({ score: "" }))).toBeNull();
    expect(scoreline(soccerGame(), state({ score: "6-4, 3-2" }))).toBeNull();
    expect(scoreline(soccerGame({ teams: [] }), state())).toBeNull();
  });
});
