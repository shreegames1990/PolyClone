import { z } from "zod";

/** Parsers for Data API v2 (`{ data, pagination }` envelope, snake_case fields). */

const num = z.coerce.number().refine(Number.isFinite).catch(0);
const str = z.string().catch("");

const envelopeSchema = z
  .object({
    data: z.unknown(),
    pagination: z.object({ next_cursor: z.string().nullish() }).nullish().catch(null),
  })
  .catch({ data: [], pagination: null });

const positionSchema = z.object({
  token_id: z.coerce.string(),
  title: str,
  icon: str,
  event_slug: str,
  outcome: str,
  current_size: num,
  avg_price: num,
  current_price: num,
  total_cost_usdc: num,
  current_value: num,
  total_pnl: num,
  percent_pnl: num,
  redeemable: z.boolean().catch(false),
  end_date: str,
});

export interface Position {
  readonly tokenId: string;
  readonly title: string;
  readonly icon: string;
  readonly eventSlug: string;
  readonly outcome: string;
  readonly size: number;
  readonly avgPrice: number;
  readonly curPrice: number;
  readonly cost: number;
  readonly value: number;
  readonly pnl: number;
  readonly percentPnl: number;
  readonly redeemable: boolean;
  readonly endDate: string;
}

const activitySchema = z.object({
  timestamp: num,
  type: str,
  side: str,
  size: num,
  usdc_size: num,
  price: num,
  title: str,
  outcome: str,
  event_slug: str,
  icon: str,
  transaction_hash: str,
});

export interface Activity {
  readonly timestamp: number;
  readonly type: string;
  readonly side: string;
  readonly size: number;
  readonly usdcSize: number;
  readonly price: number;
  readonly title: string;
  readonly outcome: string;
  readonly eventSlug: string;
  readonly icon: string;
  readonly txHash: string;
}

export interface PageOf<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
}

function parseList<S extends z.ZodType, T>(raw: unknown, schema: S, map: (row: z.infer<S>) => T): PageOf<T> {
  const envelope = envelopeSchema.parse(raw);
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const items = rows.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [map(parsed.data)] : [];
  });
  return { items, nextCursor: envelope.pagination?.next_cursor ?? null };
}

export function parsePositions(raw: unknown): PageOf<Position> {
  return parseList(raw, positionSchema, (p) => ({
    tokenId: p.token_id,
    title: p.title,
    icon: p.icon,
    eventSlug: p.event_slug,
    outcome: p.outcome,
    size: p.current_size,
    avgPrice: p.avg_price,
    curPrice: p.current_price,
    cost: p.total_cost_usdc,
    value: p.current_value,
    pnl: p.total_pnl,
    percentPnl: p.percent_pnl,
    redeemable: p.redeemable,
    endDate: p.end_date,
  }));
}

export function parseActivity(raw: unknown): PageOf<Activity> {
  return parseList(raw, activitySchema, (a) => ({
    timestamp: a.timestamp * 1000,
    type: a.type,
    side: a.side,
    size: a.size,
    usdcSize: a.usdc_size,
    price: a.price,
    title: a.title,
    outcome: a.outcome,
    eventSlug: a.event_slug,
    icon: a.icon,
    txHash: a.transaction_hash,
  }));
}

const valueSchema = z.object({ value: num });

export function parsePortfolioValue(raw: unknown): number {
  const data = envelopeSchema.parse(raw).data;
  const row = Array.isArray(data) ? data[0] : data;
  const parsed = valueSchema.safeParse(row);
  return parsed.success ? parsed.data.value : 0;
}
