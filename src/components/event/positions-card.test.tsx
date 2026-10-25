import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PositionsCard } from "./positions-card";
import { normalizeEvent } from "@/lib/polymarket/normalize";
import type { Position } from "@/lib/polymarket/data-api";

const positions = vi.hoisted(() => ({ data: undefined as Position[] | undefined }));

vi.mock("@/components/trading/trading-provider", () => ({ useTrading: () => ({ tradingAddress: "0xabc" }) }));
vi.mock("@/hooks/use-portfolio", () => ({ usePositions: () => ({ data: positions.data }) }));

const event = normalizeEvent({
  id: "1",
  teams: [{ name: "Athletic Club", abbreviation: "bil", color: "#c8102e" }],
  markets: [
    { id: "h", groupItemTitle: "Athletic Club", sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["h-yes","h-no"]' },
    { id: "d", groupItemTitle: "Draw (Athletic Club vs. Getafe CF)", sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["d-yes","d-no"]' },
  ],
});

const held: Position = {
  tokenId: "h-yes",
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
};

beforeEach(() => {
  positions.data = undefined;
});

describe("PositionsCard", () => {
  it("renders nothing when the wallet holds nothing in this event", () => {
    positions.data = [{ ...held, tokenId: "elsewhere" }];
    const { container } = render(<PositionsCard event={event} onSell={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the held position like polymarket.com", () => {
    positions.data = [held];
    render(<PositionsCard event={event} onSell={vi.fn()} />);
    expect(screen.getByText("All Positions")).toBeInTheDocument();
    expect(screen.getByText("Moneyline")).toBeInTheDocument();
    expect(screen.getByText("BIL YES")).toBeInTheDocument();
    expect(screen.getByText("3,112")).toBeInTheDocument();
    expect(screen.getByText("95¢")).toBeInTheDocument();
    expect(screen.getByText("$2,956.46")).toBeInTheDocument();
    expect(screen.getByText("$3,112.00")).toBeInTheDocument();
    expect(screen.getByText(/\$3,108\.89 \(\+\$152\.43\)/)).toBeInTheDocument();
  });

  it("asks to sell the row's market and outcome", () => {
    positions.data = [held];
    const onSell = vi.fn();
    render(<PositionsCard event={event} onSell={onSell} />);
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(onSell).toHaveBeenCalledWith("h", 0);
  });

  it("collapses and expands the table", () => {
    positions.data = [held];
    render(<PositionsCard event={event} onSell={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /All Positions/ }));
    expect(screen.queryByText("BIL YES")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /All Positions/ }));
    expect(screen.getByText("BIL YES")).toBeInTheDocument();
  });
});
