import { z } from "zod";
import type { TickSize } from "@/lib/polymarket/types";
import type { BookLevel } from "@/lib/trading/order-math";

export interface OrderBook {
  /** Highest price first. */
  readonly bids: readonly BookLevel[];
  /** Lowest price first. */
  readonly asks: readonly BookLevel[];
  readonly lastTradePrice: number | null;
  readonly tickSize?: TickSize;
  readonly minOrderSize?: number;
}

export type BooksState = Readonly<Record<string, OrderBook>>;

export const emptyBooks: BooksState = Object.freeze({});

const levelSchema = z.object({ price: z.coerce.number(), size: z.coerce.number() });
const levelsSchema = z.array(z.unknown()).catch([]);

function parseLevels(value: unknown): BookLevel[] {
  return levelsSchema.parse(value).flatMap((raw) => {
    const level = levelSchema.safeParse(raw);
    if (!level.success) return [];
    const { price, size } = level.data;
    return Number.isFinite(price) && Number.isFinite(size) && size > 0 ? [{ price, size }] : [];
  });
}

const byPriceDesc = (a: BookLevel, b: BookLevel) => b.price - a.price;
const byPriceAsc = (a: BookLevel, b: BookLevel) => a.price - b.price;

const TICK_SIZES = new Set(["0.1", "0.01", "0.001", "0.0001"]);

export function bookFromRest(raw: unknown): OrderBook {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const book: OrderBook = {
    bids: parseLevels(obj.bids).sort(byPriceDesc),
    asks: parseLevels(obj.asks).sort(byPriceAsc),
    lastTradePrice: null,
  };
  const tick = String(obj.tick_size ?? "");
  const minSize = Number(obj.min_order_size);
  return {
    ...book,
    ...(TICK_SIZES.has(tick) ? { tickSize: tick as TickSize } : {}),
    ...(minSize > 0 ? { minOrderSize: minSize } : {}),
  };
}

const changeSchema = z.object({
  asset_id: z.string().optional(),
  price: z.coerce.number(),
  size: z.coerce.number(),
  side: z.enum(["BUY", "SELL"]),
});
type Change = z.infer<typeof changeSchema>;

function updateLevels(levels: readonly BookLevel[], change: Change, desc: boolean): BookLevel[] {
  const rest = levels.filter((l) => l.price !== change.price);
  const next = change.size > 0 ? [...rest, { price: change.price, size: change.size }] : rest;
  return next.sort(desc ? byPriceDesc : byPriceAsc);
}

function applyChange(state: BooksState, assetId: string, change: Change): BooksState {
  const book = state[assetId];
  if (!book) return state;
  const updated: OrderBook =
    change.side === "BUY"
      ? { ...book, bids: updateLevels(book.bids, change, true) }
      : { ...book, asks: updateLevels(book.asks, change, false) };
  return { ...state, [assetId]: updated };
}

function applyPriceChanges(state: BooksState, msg: Record<string, unknown>): BooksState {
  const list = Array.isArray(msg.price_changes) ? msg.price_changes : Array.isArray(msg.changes) ? msg.changes : [];
  return list.reduce<BooksState>((acc, raw) => {
    const parsed = changeSchema.safeParse(raw);
    if (!parsed.success) return acc;
    const assetId = parsed.data.asset_id ?? (typeof msg.asset_id === "string" ? msg.asset_id : "");
    return applyChange(acc, assetId, parsed.data);
  }, state);
}

function applyOne(state: BooksState, message: unknown): BooksState {
  if (typeof message !== "object" || message === null) return state;
  const msg = message as Record<string, unknown>;
  const assetId = typeof msg.asset_id === "string" ? msg.asset_id : "";

  switch (msg.event_type) {
    case "book": {
      if (!assetId) return state;
      const previous = state[assetId];
      const book = bookFromRest(msg);
      return {
        ...state,
        [assetId]: {
          ...previous,
          ...book,
          lastTradePrice: previous?.lastTradePrice ?? null,
        },
      };
    }
    case "price_change":
      return applyPriceChanges(state, msg);
    case "last_trade_price": {
      const book = state[assetId];
      const price = Number(msg.price);
      if (!book || !Number.isFinite(price)) return state;
      return { ...state, [assetId]: { ...book, lastTradePrice: price } };
    }
    case "tick_size_change": {
      const book = state[assetId];
      const tick = String(msg.new_tick_size ?? "");
      if (!book || !TICK_SIZES.has(tick)) return state;
      return { ...state, [assetId]: { ...book, tickSize: tick as TickSize } };
    }
    default:
      return state;
  }
}

/** Pure reducer for CLOB market-channel WebSocket messages. */
export function applySocketMessage(state: BooksState, message: unknown): BooksState {
  return Array.isArray(message) ? message.reduce<BooksState>(applyOne, state) : applyOne(state, message);
}

export function bookSummary(book: OrderBook | undefined) {
  const bestBid = book?.bids[0]?.price ?? null;
  const bestAsk = book?.asks[0]?.price ?? null;
  const both = bestBid !== null && bestAsk !== null;
  return {
    bestBid,
    bestAsk,
    mid: both ? (bestBid + bestAsk) / 2 : null,
    spread: both ? bestAsk - bestBid : null,
  };
}

export interface CumulativeLevel extends BookLevel {
  /** Dollar value of this level plus every better-priced level before it. */
  readonly total: number;
}

const MICRO = 1_000_000;

/** Running dollar totals for levels ordered best price first (asks ascending, bids descending). */
export function withCumulativeTotals(levels: readonly BookLevel[]): CumulativeLevel[] {
  return levels.reduce<CumulativeLevel[]>((acc, level) => {
    const previous = acc.at(-1)?.total ?? 0;
    const total = Math.round((previous + level.price * level.size) * MICRO) / MICRO;
    return [...acc, { ...level, total }];
  }, []);
}
