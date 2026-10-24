import { describe, expect, it } from "vitest";
import {
  applySocketMessage,
  bookFromRest,
  bookSummary,
  emptyBooks,
  withCumulativeTotals,
  type BooksState,
} from "./orderbook";

const snapshot = {
  event_type: "book",
  asset_id: "A",
  bids: [
    { price: "0.48", size: "100" },
    { price: "0.50", size: "20" },
  ],
  asks: [
    { price: "0.55", size: "10" },
    { price: "0.52", size: "30" },
  ],
};

const withSnapshot = (): BooksState => applySocketMessage(emptyBooks, snapshot);

describe("bookFromRest", () => {
  it("parses and sorts levels", () => {
    const book = bookFromRest(snapshot);
    expect(book.bids.map((l) => l.price)).toEqual([0.5, 0.48]);
    expect(book.asks.map((l) => l.price)).toEqual([0.52, 0.55]);
  });

  it("drops invalid levels and tolerates garbage", () => {
    expect(bookFromRest({ bids: [{ price: "x", size: "1" }], asks: "nope" })).toEqual({
      bids: [],
      asks: [],
      lastTradePrice: null,
    });
  });

  it("reads tick size and min order size when present", () => {
    const book = bookFromRest({ ...snapshot, tick_size: "0.001", min_order_size: "5" });
    expect(book.tickSize).toBe("0.001");
    expect(book.minOrderSize).toBe(5);
  });
});

describe("applySocketMessage", () => {
  it("stores a book snapshot", () => {
    const state = withSnapshot();
    expect(state.A?.bids[0]).toEqual({ price: 0.5, size: 20 });
    expect(state.A?.asks[0]).toEqual({ price: 0.52, size: 30 });
  });

  it("does not mutate previous state", () => {
    const before = withSnapshot();
    const frozen = JSON.stringify(before);
    applySocketMessage(before, {
      event_type: "price_change",
      price_changes: [{ asset_id: "A", price: "0.5", size: "0", side: "BUY" }],
    });
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it("applies new-format price changes (update, insert, remove)", () => {
    const state = applySocketMessage(withSnapshot(), {
      event_type: "price_change",
      price_changes: [
        { asset_id: "A", price: "0.50", size: "0", side: "BUY" },
        { asset_id: "A", price: "0.49", size: "5", side: "BUY" },
        { asset_id: "A", price: "0.52", size: "40", side: "SELL" },
      ],
    });
    expect(state.A?.bids).toEqual([
      { price: 0.49, size: 5 },
      { price: 0.48, size: 100 },
    ]);
    expect(state.A?.asks[0]).toEqual({ price: 0.52, size: 40 });
  });

  it("applies legacy-format price changes", () => {
    const state = applySocketMessage(withSnapshot(), {
      event_type: "price_change",
      asset_id: "A",
      changes: [{ price: "0.51", size: "7", side: "SELL" }],
    });
    expect(state.A?.asks[0]).toEqual({ price: 0.51, size: 7 });
  });

  it("ignores price changes for unknown books", () => {
    const state = applySocketMessage(emptyBooks, {
      event_type: "price_change",
      price_changes: [{ asset_id: "Z", price: "0.5", size: "1", side: "BUY" }],
    });
    expect(state).toBe(emptyBooks);
  });

  it("records last trade price", () => {
    const state = applySocketMessage(withSnapshot(), {
      event_type: "last_trade_price",
      asset_id: "A",
      price: "0.53",
    });
    expect(state.A?.lastTradePrice).toBe(0.53);
  });

  it("applies tick size changes", () => {
    const state = applySocketMessage(withSnapshot(), {
      event_type: "tick_size_change",
      asset_id: "A",
      new_tick_size: "0.001",
    });
    expect(state.A?.tickSize).toBe("0.001");
  });

  it("handles arrays of messages", () => {
    const state = applySocketMessage(emptyBooks, [snapshot, { ...snapshot, asset_id: "B" }]);
    expect(Object.keys(state).sort()).toEqual(["A", "B"]);
  });

  it("ignores unknown messages", () => {
    expect(applySocketMessage(emptyBooks, { event_type: "best_bid_ask" })).toBe(emptyBooks);
    expect(applySocketMessage(withSnapshot(), { event_type: "tick_size_change", asset_id: "A", new_tick_size: "7" }).A?.tickSize).toBeUndefined();
    expect(applySocketMessage(emptyBooks, "PONG")).toBe(emptyBooks);
  });
});

describe("bookSummary", () => {
  it("computes best bid/ask, mid and spread", () => {
    const s = bookSummary(withSnapshot().A);
    expect(s.bestBid).toBe(0.5);
    expect(s.bestAsk).toBe(0.52);
    expect(s.mid).toBeCloseTo(0.51);
    expect(s.spread).toBeCloseTo(0.02);
  });

  it("handles a missing book", () => {
    expect(bookSummary(undefined)).toEqual({ bestBid: null, bestAsk: null, mid: null, spread: null });
  });
});

describe("withCumulativeTotals", () => {
  it("sums each level's dollar value with every better level before it", () => {
    const asks = [
      { price: 0.71, size: 150 },
      { price: 0.72, size: 100 },
      { price: 0.74, size: 10 },
    ];
    expect(withCumulativeTotals(asks)).toEqual([
      { price: 0.71, size: 150, total: 106.5 },
      { price: 0.72, size: 100, total: 178.5 },
      { price: 0.74, size: 10, total: 185.9 },
    ]);
  });

  it("returns an empty list for no levels", () => {
    expect(withCumulativeTotals([])).toEqual([]);
  });

  it("avoids float noise in the running sum", () => {
    const [, second] = withCumulativeTotals([
      { price: 0.1, size: 1 },
      { price: 0.2, size: 1 },
    ]);
    expect(second?.total).toBe(0.3);
  });
});
