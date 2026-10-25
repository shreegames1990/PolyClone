import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderBook } from "./order-book";
import type { OrderBook as Book } from "@/lib/polymarket/orderbook";

const book = {
  assetId: "h-yes",
  bids: [
    { price: 0.61, size: 100 },
    { price: 0.6, size: 50 },
  ],
  asks: [
    { price: 0.62, size: 80 },
    { price: 0.65, size: 20 },
  ],
  lastTradePrice: 0.62,
  tickSize: "0.01",
  minOrderSize: 5,
} as unknown as Book;

describe("OrderBook resting order markers", () => {
  it("marks the levels where the user has resting orders", () => {
    render(<OrderBook book={book} status="live" tradeLabel="BAR" resting={{ bids: new Set([0.61]), asks: new Set([0.65]) }} />);
    const marks = screen.getAllByLabelText("Your resting order");
    expect(marks).toHaveLength(2);
    expect(marks.map((m) => m.closest("[data-price]")?.getAttribute("data-price")).sort()).toEqual(["0.61", "0.65"]);
  });

  it("shows no markers without resting orders", () => {
    render(<OrderBook book={book} status="live" tradeLabel="BAR" />);
    expect(screen.queryByLabelText("Your resting order")).not.toBeInTheDocument();
  });
});
