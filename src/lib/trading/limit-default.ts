import type { TickSize } from "@/lib/polymarket/types";
import { roundToTick } from "./order-math";

const CENTS = 100;

/** Limit price prefill (in cents) from the outcome's current price, on the market's tick grid. */
export function defaultLimitCents(price: number | undefined, tickSize: TickSize): string {
  if (price === undefined || price <= 0 || price >= 1) return "";
  const decimals = Math.max(0, (tickSize.split(".")[1]?.length ?? 0) - 2);
  const tick = Number(tickSize);
  // Valid limit prices lie strictly inside (0, 1): clamp nearly-decided markets to one tick in.
  const clamped = Math.min(1 - tick, Math.max(tick, roundToTick(price, tickSize)));
  return String(Number((clamped * CENTS).toFixed(decimals)));
}
