import { z } from "zod";
import type { TickSize } from "@/lib/polymarket/types";
import type { Game, Market, Outcome, PolyEvent, Tag, Team } from "./types";

/**
 * Gamma returns numbers as strings or numbers and several arrays as
 * JSON-encoded strings. These lenient schemas coerce everything at the
 * boundary so the rest of the app works with clean, typed values.
 */
const num = z.coerce.number().refine(Number.isFinite).catch(0);
const str = z.string().catch("");
const bool = z.boolean().catch(false);

const tagSchema = z.object({ id: z.coerce.string().catch(""), label: str, slug: str });
const EMPTY_TEAM = { name: "", abbreviation: "", alias: "", color: "", logo: "" };

/** Gamma team logo URLs can contain raw spaces and accents; encode without double-encoding. */
function encodeUrl(url: string): string {
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return encodeURI(url);
  }
}

const teamSchema = z
  .object({ name: str, abbreviation: str, alias: str, color: str, logo: str.transform(encodeUrl) })
  .catch(EMPTY_TEAM);

const rawMarketSchema = z.object({
  id: z.coerce.string().catch(""),
  question: str,
  groupItemTitle: str,
  sportsMarketType: str,
  slug: str,
  conditionId: str,
  image: str,
  icon: str,
  outcomes: z.unknown().optional(),
  outcomePrices: z.unknown().optional(),
  clobTokenIds: z.unknown().optional(),
  positionIds: z.unknown().optional(),
  version: str,
  volume: num,
  volumeNum: num,
  liquidityNum: num,
  volume24hr: num,
  liquidity: num,
  bestBid: num,
  bestAsk: num,
  lastTradePrice: num,
  oneDayPriceChange: num,
  endDate: str,
  active: z.boolean().catch(true),
  closed: bool,
  archived: bool,
  acceptingOrders: bool,
  enableOrderBook: z.boolean().catch(true),
  negRisk: bool,
  orderPriceMinTickSize: num,
  orderMinSize: num,
  feesEnabled: bool,
  feeSchedule: z
    .object({ rate: z.coerce.number(), exponent: z.coerce.number(), takerOnly: z.boolean().catch(true) })
    .nullish()
    .catch(null),
});

const rawEventSchema = z.object({
  id: z.coerce.string().catch(""),
  parentEventId: z.union([z.string(), z.number()]).transform(String).catch(""),
  slug: str,
  title: str,
  description: str,
  image: str,
  icon: str,
  volume: num,
  volume24hr: num,
  liquidity: num,
  endDate: str,
  closed: bool,
  negRisk: bool,
  commentCount: num,
  tags: z.array(tagSchema).catch([]),
  teams: z.array(z.unknown()).catch([]),
  markets: z.array(z.unknown()).catch([]),
  gameId: z.coerce.number().int().positive().nullable().catch(null),
  homeTeamName: str,
  awayTeamName: str,
  live: bool,
  ended: bool,
  score: str,
  period: str,
  elapsed: z.union([z.string(), z.number()]).transform(String).catch(""),
});

const TICK_SIZES: readonly TickSize[] = ["0.1", "0.01", "0.001", "0.0001"];
const DEFAULT_MIN_SIZE = 5;

export function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toTickSize(value: number): TickSize {
  if (value <= 0) return "0.01";
  return TICK_SIZES.reduce((best, tick) =>
    Math.abs(Number(tick) - value) < Math.abs(Number(best) - value) ? tick : best,
  );
}

function buildOutcomes(raw: z.infer<typeof rawMarketSchema>): Outcome[] {
  const names = parseJsonArray(raw.outcomes);
  const prices = parseJsonArray(raw.outcomePrices);
  // v1 (CTF) markets trade by clobTokenIds; v2 markets trade by positionIds.
  const tokens = raw.version === "v2" ? parseJsonArray(raw.positionIds) : parseJsonArray(raw.clobTokenIds);
  return names.map((name, i) => ({
    name: String(name),
    price: num.parse(prices[i]),
    tokenId: tokens[i] === undefined ? "" : String(tokens[i]),
  }));
}

export function normalizeMarket(input: unknown): Market {
  const raw = rawMarketSchema.parse(input ?? {});
  const outcomes = buildOutcomes(raw);
  return {
    id: raw.id,
    question: raw.question,
    label: raw.groupItemTitle || raw.question,
    sportsMarketType: raw.sportsMarketType,
    slug: raw.slug,
    conditionId: raw.conditionId,
    image: raw.image || raw.icon,
    outcomes,
    volume: raw.volumeNum || raw.volume,
    volume24hr: raw.volume24hr,
    liquidity: raw.liquidityNum || raw.liquidity,
    bestBid: raw.bestBid,
    bestAsk: raw.bestAsk,
    lastTradePrice: raw.lastTradePrice,
    oneDayPriceChange: raw.oneDayPriceChange,
    endDate: raw.endDate,
    closed: raw.closed,
    tradable:
      raw.active &&
      !raw.closed &&
      !raw.archived &&
      raw.acceptingOrders &&
      raw.enableOrderBook &&
      outcomes.length > 0 &&
      outcomes.every((o) => o.tokenId !== ""),
    negRisk: raw.negRisk,
    tickSize: toTickSize(raw.orderPriceMinTickSize),
    minSize: raw.orderMinSize > 0 ? raw.orderMinSize : DEFAULT_MIN_SIZE,
    fee: raw.feesEnabled && raw.feeSchedule ? raw.feeSchedule : null,
  };
}

const yesPrice = (m: Market): number => m.outcomes[0]?.price ?? 0;
const isMoneyline = (m: Market): boolean => m.sportsMarketType === "moneyline";

/**
 * Moneyline markets first, kept in Gamma order (home, draw, away); then open
 * markets before closed ones, then by leading-outcome probability.
 */
function compareMarkets(a: Market, b: Market): number {
  if (isMoneyline(a) !== isMoneyline(b)) return isMoneyline(a) ? -1 : 1;
  if (isMoneyline(a)) return 0;
  if (a.closed !== b.closed) return a.closed ? 1 : -1;
  return yesPrice(b) - yesPrice(a);
}

function buildGame(raw: z.infer<typeof rawEventSchema>): Game | null {
  if (raw.gameId === null) return null;
  return {
    id: raw.gameId,
    homeTeam: raw.homeTeamName,
    awayTeam: raw.awayTeamName,
    state: { live: raw.live, ended: raw.ended, score: raw.score, period: raw.period, elapsed: raw.elapsed },
  };
}

export function normalizeEvent(input: unknown): PolyEvent {
  const raw = rawEventSchema.parse(input ?? {});
  const markets = raw.markets.map(normalizeMarket).sort(compareMarkets);
  const tags: Tag[] = raw.tags.filter((t) => t.label !== "");
  const teams: Team[] = raw.teams.map((t) => teamSchema.parse(t ?? {})).filter((t) => t.name !== "");
  return {
    id: raw.id,
    parentEventId: raw.parentEventId,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    image: raw.image || raw.icon,
    icon: raw.icon || raw.image,
    volume: raw.volume,
    volume24hr: raw.volume24hr,
    liquidity: raw.liquidity,
    endDate: raw.endDate,
    closed: raw.closed,
    negRisk: raw.negRisk,
    commentCount: raw.commentCount,
    tags,
    teams,
    markets,
    game: buildGame(raw),
    isBinary: markets.length === 1,
  };
}
