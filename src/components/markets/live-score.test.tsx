import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "./event-card";
import { normalizeEvent } from "@/lib/polymarket/normalize";
import type { GameState } from "@/lib/polymarket/types";

const live = vi.hoisted(() => ({ state: undefined as GameState | undefined, calls: [] as unknown[] }));

vi.mock("@/hooks/use-live-game", () => ({
  useLiveGame: (gameId: number | null) => {
    live.calls.push(gameId);
    return live.state;
  },
}));

const soccerGame = (overrides: Record<string, unknown> = {}) =>
  normalizeEvent({
    id: "1",
    slug: "epl-ars-che",
    title: "Arsenal vs. Chelsea",
    tags: [{ id: "306", label: "EPL", slug: "epl" }],
    teams: [
      { name: "Arsenal", abbreviation: "ars", logo: "https://x.test/ars.png" },
      { name: "Chelsea", abbreviation: "che", logo: "https://x.test/che.png" },
    ],
    gameId: 9001,
    homeTeamName: "Arsenal",
    awayTeamName: "Chelsea",
    live: true,
    score: "1-0",
    period: "1H",
    elapsed: "23",
    ...overrides,
  });

describe("EventCard live score", () => {
  beforeEach(() => {
    live.state = undefined;
    live.calls = [];
  });

  it("shows the Gamma score for a live soccer game", () => {
    render(<EventCard event={soccerGame()} />);
    const score = screen.getByRole("status", { name: "Live score" });
    expect(score).toHaveTextContent("LIVE");
    expect(score).toHaveTextContent("1H · 23'");
    expect(score).toHaveTextContent("ARS1–0CHE");
    expect(live.calls).toContain(9001);
  });

  it("prefers the latest state from the sports socket", () => {
    live.state = { live: true, ended: false, score: "2-2", period: "2H", elapsed: "88" };
    render(<EventCard event={soccerGame()} />);
    const score = screen.getByRole("status", { name: "Live score" });
    expect(score).toHaveTextContent("2H · 88'");
    expect(score).toHaveTextContent("ARS2–2CHE");
  });

  it("shows the final score without the live marker", () => {
    live.state = { live: false, ended: true, score: "3-1", period: "FT", elapsed: "90" };
    render(<EventCard event={soccerGame()} />);
    const score = screen.getByRole("status", { name: "Final score" });
    expect(score).toHaveTextContent("FT");
    expect(score).not.toHaveTextContent("LIVE");
  });

  it("shows nothing before kick-off", () => {
    render(<EventCard event={soccerGame({ live: false, score: "" })} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not subscribe or render for other sports", () => {
    render(<EventCard event={soccerGame({ tags: [{ id: "745", label: "NBA", slug: "nba" }] })} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(live.calls.every((id) => id === null)).toBe(true);
  });
});
