import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "./event-card";
import { normalizeEvent } from "@/lib/polymarket/normalize";

const HOME = "Club Atlético de Madrid";
const AWAY = "RC Deportivo A Coruña";

const game = normalizeEvent({
  id: "1",
  slug: "lal-mad-dep",
  title: `${HOME} vs. ${AWAY}`,
  icon: "https://x.test/laliga.png",
  teams: [
    { name: HOME, abbreviation: "mad", logo: "https://x.test/mad.png" },
    { name: AWAY, abbreviation: "dep", logo: "https://x.test/dep.png" },
  ],
  markets: [
    { id: "h", groupItemTitle: HOME, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', outcomePrices: '["0.75","0.25"]' },
    { id: "d", groupItemTitle: `Draw (${HOME} vs. ${AWAY})`, sportsMarketType: "moneyline", outcomes: '["Yes","No"]', outcomePrices: '["0.18","0.82"]' },
  ],
});

describe("EventCard", () => {
  it("shows both team logos instead of the tournament icon for games", () => {
    render(<EventCard event={game} />);
    const header = screen.getByRole("group", { name: `${HOME} vs ${AWAY}` });
    expect(header.querySelectorAll("img")).toHaveLength(2);
    expect(screen.queryByAltText("laliga")).not.toBeInTheDocument();
    expect(document.querySelector('img[src*="laliga.png"]')).toBeNull();
  });

  it("shows one button per moneyline outcome side by side with its best Yes bid", () => {
    render(<EventCard event={game} />);
    const buttons = screen.getAllByRole("link", { name: /¢$/ });
    expect(buttons.map((b) => b.textContent)).toEqual(["MAD75¢", "DRAW18¢"]);
    // Label and price sit on one line.
    expect(buttons[0]).toHaveClass("flex-row");
    expect(buttons[0]).toHaveAttribute("href", "/event/lal-mad-dep?market=h&side=yes");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("stacks markets in a scrollable list when an event has more than three", () => {
    const many = normalizeEvent({
      id: "3",
      slug: "nba-champ",
      title: "NBA Champion",
      markets: ["OKC", "SAS", "PHI", "BOS", "NYK"].map((name, i) => ({
        id: name,
        groupItemTitle: name,
        outcomes: '["Yes","No"]',
        outcomePrices: `["${0.3 - i * 0.05}","${0.7 + i * 0.05}"]`,
      })),
    });
    render(<EventCard event={many} />);
    const list = screen.getByRole("list", { name: "Markets" });
    expect(list).toHaveClass("overflow-y-auto");
    expect(list.querySelectorAll("li")).toHaveLength(5);
  });

  it("keeps the event icon for events without team logos", () => {
    const plain = normalizeEvent({ id: "2", slug: "p", title: "Fed decision", icon: "https://x.test/fed.png", markets: [] });
    render(<EventCard event={plain} />);
    expect(document.querySelector('img[src*="fed.png"]')).not.toBeNull();
  });
});
