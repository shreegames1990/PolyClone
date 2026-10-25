import { buildMoneylineOptions } from "./moneyline";
import type { Market, PolyEvent, Team } from "./types";

/** One outcome on an event card: a side-by-side button or a stacked list row. */
export interface CardOutcome {
  readonly marketId: string;
  /** Team abbreviation ("MAD"), "DRAW", or the market label. */
  readonly label: string;
  /** Best bid for Yes; the last Yes price when the book has no bid. */
  readonly price: number;
  /** Team color for game buttons; null otherwise. */
  readonly color: string | null;
  /** Outcome the event page opens on: "yes" (first outcome) or "no" (second). */
  readonly side: "yes" | "no";
}

/** Up to this many outcomes fit side by side; more are stacked in a scrollable list. */
const MAX_ROW_ITEMS = 3;

export interface CardOutcomes {
  readonly layout: "row" | "list";
  readonly items: readonly CardOutcome[];
}

const yesBid = (market: Market): number => market.bestBid || (market.outcomes[0]?.price ?? 0);
/** Best bid for the second outcome: 1 - the first outcome's best ask. */
const noBid = (market: Market): number =>
  market.bestAsk ? Math.round((1 - market.bestAsk) * 10_000) / 10_000 : (market.outcomes[1]?.price ?? 0);

const teamForOutcome = (teams: readonly Team[], outcome: string): Team | undefined =>
  teams.find((t) => t.name === outcome || (t.alias !== "" && t.alias === outcome));

/** A single moneyline market whose two outcomes are the teams (e.g. NFL "Browns" / "Titans"). */
function singleMarketMoneyline(event: PolyEvent): CardOutcome[] {
  const market = event.markets.find((m) => m.sportsMarketType === "moneyline" && m.outcomes.length === 2);
  if (!market) return [];
  const [first, second] = market.outcomes.map((o) => teamForOutcome(event.teams, o.name));
  if (!first || !second) return [];
  const button = (team: Team, price: number, side: "yes" | "no"): CardOutcome => ({
    marketId: market.id,
    label: team.abbreviation ? team.abbreviation.toUpperCase() : team.name,
    price,
    color: team.color || null,
    side,
  });
  return [button(first, yesBid(market), "yes"), button(second, noBid(market), "no")];
}

/**
 * Outcomes for a multi-market card. Games show their moneyline side by side (MAD / DRAW / DEP,
 * or CLE / TEN from one two-team market). Other events show up to three open markets side by
 * side, or every open market stacked in a scrollable list (ordered by chance in normalizeEvent).
 */
export function cardOutcomes(event: PolyEvent): CardOutcomes {
  const byId = new Map(event.markets.map((m) => [m.id, m]));
  const moneyline = buildMoneylineOptions(event);
  if (moneyline.length > 0) {
    const items = moneyline.slice(0, MAX_ROW_ITEMS).map((o) => ({
      marketId: o.marketId,
      label: o.label,
      price: yesBid(byId.get(o.marketId)!),
      color: o.color,
      side: "yes" as const,
    }));
    return { layout: "row", items };
  }
  const single = singleMarketMoneyline(event);
  if (single.length > 0) return { layout: "row", items: single };

  const items = event.markets
    .filter((m) => !m.closed)
    .map((m) => ({ marketId: m.id, label: m.label, price: yesBid(m), color: null, side: "yes" as const }));
  return { layout: items.length > MAX_ROW_ITEMS ? "list" : "row", items };
}
