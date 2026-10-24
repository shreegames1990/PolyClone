import { z } from "zod";

export interface PricePoint {
  readonly t: number;
  readonly p: number;
}

/** Chart ranges; fidelity is the bucket size in minutes. */
export const INTERVALS = [
  { key: "1h", label: "1H", fidelity: 1 },
  { key: "6h", label: "6H", fidelity: 5 },
  { key: "1d", label: "1D", fidelity: 15 },
  { key: "1w", label: "1W", fidelity: 60 },
  { key: "1m", label: "1M", fidelity: 240 },
  { key: "max", label: "ALL", fidelity: 1440 },
] as const;

export type IntervalKey = (typeof INTERVALS)[number]["key"];

const pointSchema = z.object({ t: z.coerce.number(), p: z.coerce.number() });
const historySchema = z.object({ history: z.array(z.unknown()).catch([]) }).catch({ history: [] });

export function parsePriceHistory(raw: unknown): PricePoint[] {
  return historySchema.parse(raw).history.flatMap((item) => {
    const parsed = pointSchema.safeParse(item);
    if (!parsed.success || !Number.isFinite(parsed.data.t) || !Number.isFinite(parsed.data.p)) return [];
    return [{ t: parsed.data.t * 1000, p: parsed.data.p }];
  });
}

export type ChartRow = { t: number } & Record<string, number>;

/** Joins several series into rows keyed by timestamp for a multi-line chart. */
export function mergeSeries(series: readonly { key: string; points: readonly PricePoint[] }[]): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  for (const { key, points } of series) {
    for (const { t, p } of points) {
      rows.set(t, { ...(rows.get(t) ?? { t }), [key]: p });
    }
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}
