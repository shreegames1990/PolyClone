import type { TickSize } from "@/lib/polymarket/types";

export type OrderSide = "BUY" | "SELL";

export interface BookLevel {
  readonly price: number;
  readonly size: number;
}

const EPSILON = 1e-9;

export function roundToTick(price: number, tickSize: TickSize): number {
  const tick = Number(tickSize);
  const decimals = tickSize.split(".")[1]?.length ?? 0;
  return Number((Math.round(price / tick) * tick).toFixed(decimals));
}

export function limitOrderSummary(input: {
  side: OrderSide;
  price: number;
  shares: number;
}) {
  const total = round2(input.price * input.shares);
  if (input.side === "SELL") return { total, payout: total, profit: 0 };
  return { total, payout: input.shares, profit: round2(input.shares - total) };
}

/** Walks the ask side spending `amount` USDC, cheapest first. */
export function estimateMarketBuy(asks: readonly BookLevel[], amount: number) {
  const sorted = [...asks].sort((a, b) => a.price - b.price);
  let remaining = amount;
  let shares = 0;
  let worstPrice = 0;

  for (const level of sorted) {
    if (remaining <= EPSILON) break;
    const levelCost = level.price * level.size;
    const spend = Math.min(remaining, levelCost);
    shares += spend / level.price;
    remaining -= spend;
    worstPrice = level.price;
  }

  const spent = amount - remaining;
  return {
    shares,
    spent,
    avgPrice: shares > 0 ? spent / shares : 0,
    worstPrice,
    filled: shares > 0 && remaining <= EPSILON,
  };
}

/** Walks the bid side selling `shares`, highest bid first. */
export function estimateMarketSell(bids: readonly BookLevel[], shares: number) {
  const sorted = [...bids].sort((a, b) => b.price - a.price);
  let remaining = shares;
  let proceeds = 0;
  let worstPrice = 0;

  for (const level of sorted) {
    if (remaining <= EPSILON) break;
    const take = Math.min(remaining, level.size);
    proceeds += take * level.price;
    remaining -= take;
    worstPrice = level.price;
  }

  const sharesSold = shares - remaining;
  return {
    sharesSold,
    proceeds,
    avgPrice: sharesSold > 0 ? proceeds / sharesSold : 0,
    worstPrice,
    filled: sharesSold > 0 && remaining <= EPSILON,
  };
}

/** Returns a user-facing error message, or null when the order is valid. */
export function validateLimitOrder(input: {
  price: number;
  shares: number;
  tickSize: TickSize;
  minSize: number;
}): string | null {
  const tick = Number(input.tickSize);
  if (!Number.isFinite(input.price)) return "Enter a price.";
  if (!Number.isFinite(input.shares) || input.shares <= 0) return "Enter the number of shares.";
  if (input.price < tick - EPSILON || input.price > 1 - tick + EPSILON) {
    return `Price must be between ${tick} and ${roundToTick(1 - tick, input.tickSize)}.`;
  }
  if (Math.abs(roundToTick(input.price, input.tickSize) - input.price) > EPSILON) {
    return `Price must be a multiple of the ${input.tickSize} tick size.`;
  }
  if (input.shares < input.minSize) return `Minimum order size is ${input.minSize} shares.`;
  return null;
}

export function validateMarketOrder(input: {
  amount: number;
  filled: boolean;
}): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Enter an amount.";
  if (!input.filled) return "Not enough liquidity in the order book for this amount.";
  return null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
