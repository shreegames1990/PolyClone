/**
 * Polymarket taker fees (Gamma `feeSchedule`, e.g. sports: rate 0.05, exponent 1, taker only).
 * Fee per order = shares × rate × (p × (1 − p))^exponent. The CLOB rejects buys whose
 * balance cannot cover amount + fee estimate, so the trade panel budgets for it.
 */
export interface FeeSchedule {
  readonly rate: number;
  readonly exponent: number;
  readonly takerOnly: boolean;
}

/** Headroom below the exact limit so price moves between quote and fill don't reject Max. */
const MAX_SPEND_MARGIN = 0.005;

const curve = (price: number, fee: FeeSchedule) => fee.rate * (price * (1 - price)) ** fee.exponent;

export function takerFeeUsd(shares: number, price: number, fee: FeeSchedule | null): number {
  if (!fee || shares <= 0 || price <= 0 || price >= 1) return 0;
  return shares * curve(price, fee);
}

/** Fee as a fraction of dollars spent at `price` (shares = spend / price). */
export function feeShareOfSpend(price: number, fee: FeeSchedule | null): number {
  if (!fee || price <= 0 || price >= 1) return 0;
  return curve(price, fee) / price;
}

/** Largest spend whose amount + fee fits the balance at `price`, rounded down to the cent. */
export function maxSpendAfterFees(balance: number, price: number, fee: FeeSchedule | null): number {
  const spend = (balance / (1 + feeShareOfSpend(price, fee))) * (1 - MAX_SPEND_MARGIN);
  return Math.max(0, Math.floor(spend * 100) / 100);
}
