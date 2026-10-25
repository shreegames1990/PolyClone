import type { Market, PolyEvent, Team } from "./types";

const TEAMS_PER_GAME = 2;

/** The two teams to show on a game's card, or none unless both have logos. */
export function cardTeams(event: PolyEvent): Team[] {
  const withLogos = event.teams.filter((t) => t.logo !== "");
  return withLogos.length >= TEAMS_PER_GAME ? withLogos.slice(0, TEAMS_PER_GAME) : [];
}

/**
 * Team behind the trade panel's selection: the team whose moneyline market is selected, or the
 * team named by the selected outcome of a single two-team market (matched by name or alias).
 */
export function teamForSelection(event: PolyEvent, market: Market, outcomeName: string): Team | undefined {
  const byMarket = event.teams.find((t) => t.name === market.label);
  if (byMarket) return byMarket;
  return event.teams.find((t) => t.name === outcomeName || (t.alias !== "" && t.alias === outcomeName));
}
