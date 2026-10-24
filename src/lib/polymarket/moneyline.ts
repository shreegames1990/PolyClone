import type { PolyEvent } from "./types";

export interface MoneylineOption {
  readonly marketId: string;
  /** Team abbreviation ("MAD"), "DRAW", or the market label when no team matches. */
  readonly label: string;
  /** Team color for the selected state; null for the draw or unknown teams. */
  readonly color: string | null;
  /** Price of the market's first ("Yes") outcome. */
  readonly price: number;
}

const DRAW_PREFIX = "draw";
const MIN_OPTIONS = 2;

/** Outcome buttons for a game's moneyline (home / draw / away), in market order. */
export function buildMoneylineOptions(event: PolyEvent): MoneylineOption[] {
  const markets = event.markets.filter((m) => m.sportsMarketType === "moneyline");
  if (markets.length < MIN_OPTIONS) return [];
  return markets.map((m) => {
    const price = m.outcomes[0]?.price ?? 0;
    if (m.label.toLowerCase().startsWith(DRAW_PREFIX)) return { marketId: m.id, label: "DRAW", color: null, price };
    const team = event.teams.find((t) => t.name === m.label);
    return {
      marketId: m.id,
      label: team?.abbreviation ? team.abbreviation.toUpperCase() : m.label,
      color: team?.color || null,
      price,
    };
  });
}
