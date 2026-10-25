import type { TickSize } from "@/lib/polymarket/types";
import { maxSpendAfterFees, type FeeSchedule } from "./fees";

/** One-tap dollar increments for market buys. */
export const QUICK_DOLLARS = [1, 20, 100] as const;
/** One-tap share adjustments for limit orders and sells. */
export const QUICK_SHARES = [-100, -10, 10, 100] as const;

const CENTS = 100;
const DEFAULT_LIMIT_CENTS = 50;

const positiveOrZero = (value: string): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Adds `delta` to a typed amount, never below zero; invalid input counts as zero. */
export function adjustAmount(current: string, delta: number): string {
  const next = Math.max(0, positiveOrZero(current) + delta);
  return String(Math.round(next * CENTS) / CENTS);
}

/** Moves a limit price (in cents) by one tick, staying within one tick of 0¢ and 100¢. */
export function stepLimitPrice(
  currentCents: string,
  tickSize: TickSize,
  direction: 1 | -1,
  fallbackCents: number = DEFAULT_LIMIT_CENTS,
): string {
  const tickCents = Number(tickSize) * CENTS;
  const decimals = Math.max(0, (tickSize.split(".")[1]?.length ?? 0) - 2);
  const base = positiveOrZero(currentCents) || fallbackCents;
  const next = Math.min(CENTS - tickCents, Math.max(tickCents, base + direction * tickCents));
  return String(Number(next.toFixed(decimals)));
}

/** Whole shares a balance can buy at a limit price after fees; "" when either is unknown. */
export function maxBuyShares(balance: number | undefined, limitPriceCents: string, fee: FeeSchedule | null = null): string {
  const price = positiveOrZero(limitPriceCents) / CENTS;
  if (balance === undefined || price <= 0) return "";
  return String(Math.floor(maxSpendAfterFees(balance, price, fee) / price));
}
