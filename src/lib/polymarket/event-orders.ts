import { indexEventOutcomes, type EventOutcomeInfo } from "./event-outcomes";
import type { PolyEvent } from "./types";

/** The fields of an SDK OpenOrder this app uses (kept local so the logic stays testable). */
export interface OpenOrderLike {
  readonly id: string;
  readonly tokenId: string;
  readonly side: string;
  readonly price: string;
  readonly originalSize: string;
  readonly sizeMatched: string;
  readonly orderType: string;
  readonly expiresAt?: string;
  /** Market condition id and outcome name: fallback match when token ids differ (v2 markets). */
  readonly conditionId?: string;
  readonly outcome?: string;
}

/** A resting order in one of the event's markets, shaped for the "Open Orders" table. */
export interface EventOrderRow extends EventOutcomeInfo {
  readonly id: string;
  readonly side: "Buy" | "Sell";
  readonly price: number;
  readonly filled: number;
  readonly size: number;
  /** Price × original size, as polymarket.com shows. */
  readonly total: number;
  /** ISO expiry, or null for good-till-cancelled. */
  readonly expiresAt: string | null;
}

const CENT_PRECISION = 10_000;
/** Rounds a price so order prices ("0.610") and book levels (0.61) compare equal. */
export const priceKey = (price: number): number => Math.round(price * CENT_PRECISION) / CENT_PRECISION;
const toNumber = (value: string): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** The event's token id for an order: its own, or the one with the same condition and outcome name. */
function eventTokenFor(event: PolyEvent, order: OpenOrderLike, known: ReadonlyMap<string, unknown>): string | undefined {
  if (known.has(order.tokenId)) return order.tokenId;
  const market = event.markets.find((m) => same(m.conditionId, order.conditionId));
  return market?.outcomes.find((o) => same(o.name, order.outcome))?.tokenId || undefined;
}

/** The user's open orders in this event's markets, in market order. */
export function buildEventOrders(event: PolyEvent, orders: readonly OpenOrderLike[]): EventOrderRow[] {
  const outcomes = indexEventOutcomes(event);
  return orders.flatMap((order) => {
    const token = eventTokenFor(event, order, outcomes);
    const info = token ? outcomes.get(token) : undefined;
    if (!info) return [];
    const price = toNumber(order.price);
    const size = toNumber(order.originalSize);
    return [
      {
        ...info,
        id: order.id,
        side: order.side.toUpperCase() === "SELL" ? ("Sell" as const) : ("Buy" as const),
        price,
        filled: toNumber(order.sizeMatched),
        size,
        total: Math.round(price * size * 100) / 100,
        expiresAt: order.expiresAt ?? null,
      },
    ];
  });
}

export interface RestingPrices {
  readonly bids: ReadonlySet<number>;
  readonly asks: ReadonlySet<number>;
}

/**
 * Book levels holding the user's orders for one outcome: buys rest on bids, sells on asks.
 * `match` (condition id + outcome name) also catches orders whose token id differs (v2 markets).
 */
export function restingPrices(
  orders: readonly OpenOrderLike[],
  tokenId: string,
  match?: { conditionId: string; outcome: string },
): RestingPrices {
  const bids = new Set<number>();
  const asks = new Set<number>();
  for (const order of orders) {
    const mine =
      order.tokenId === tokenId || (match && same(order.conditionId, match.conditionId) && same(order.outcome, match.outcome));
    if (!mine) continue;
    (order.side.toUpperCase() === "SELL" ? asks : bids).add(priceKey(toNumber(order.price)));
  }
  return { bids, asks };
}
