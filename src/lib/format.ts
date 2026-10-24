const toFinite = (value: number | undefined | null): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCompactUsd(value: number | undefined | null): string {
  return `$${compactFormatter.format(toFinite(value))}`;
}

export function formatUsd(value: number | undefined | null): string {
  return usdFormatter.format(toFinite(value));
}

/** Probability (0..1) → "54%", with "<1%" / ">99%" at the extremes. */
export function formatPercent(probability: number | undefined | null): string {
  const p = toFinite(probability);
  if (p > 0 && p < 0.01) return "<1%";
  if (p > 0.99 && p < 1) return ">99%";
  return `${Math.round(p * 100)}%`;
}

export function formatSignedPercent(change: number | undefined | null): string {
  const c = toFinite(change) * 100;
  const sign = c > 0 ? "+" : c < 0 ? "-" : "";
  return `${sign}${Math.abs(c).toFixed(1)}%`;
}

/** Price (0..1) → "53.5¢". */
export function formatCents(price: number | undefined | null): string {
  const cents = Math.round(toFinite(price) * 1000) / 10;
  return `${cents}¢`;
}

export function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function formatEndDate(iso: string | undefined | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}
