/**
 * Limit order expiry. "never" is good-till-cancelled; the others become GTD orders with a
 * Unix-seconds `expiration`, which the CLOB requires to be at least 3 minutes ahead.
 */
export type ExpiryOption = "never" | "1h" | "1d" | "eod";

export const EXPIRY_OPTIONS: readonly { value: ExpiryOption; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "eod", label: "End of day" },
];

const HOUR_S = 3600;
const DAY_S = 24 * HOUR_S;
/** CLOB minimum (3 min) plus a minute for latency and clock skew. */
const MIN_LEAD_S = 4 * 60;

export function expiryLabel(option: ExpiryOption): string {
  return EXPIRY_OPTIONS.find((o) => o.value === option)?.label ?? "Never";
}

/** Unix seconds for a GTD expiry computed at submit time; undefined for "never". */
export function expirationFor(option: ExpiryOption, nowMs: number = Date.now()): number | undefined {
  const now = Math.floor(nowMs / 1000);
  let target: number;
  switch (option) {
    case "never":
      return undefined;
    case "1h":
      target = now + HOUR_S;
      break;
    case "1d":
      target = now + DAY_S;
      break;
    case "eod": {
      const midnight = new Date(nowMs);
      midnight.setHours(24, 0, 0, 0);
      target = Math.floor(midnight.getTime() / 1000);
      break;
    }
  }
  return Math.max(target, now + MIN_LEAD_S);
}
