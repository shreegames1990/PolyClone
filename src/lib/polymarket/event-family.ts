import type { PolyEvent } from "./types";

/**
 * Gamma splits a sports game into a main event (the moneyline) and child
 * events ("<game> - Exact Score", "- More Markets", "- Player Props", …)
 * linked by `parentEventId`.
 */
export const isChildEvent = (event: PolyEvent): boolean => event.parentEventId !== "";

/** Browse lists show one card per game: the main event, not its children. */
export const withoutChildEvents = (events: readonly PolyEvent[]): PolyEvent[] =>
  events.filter((e) => !isChildEvent(e));

/** Highest 24h volume first; returns a new array. */
export const byVolume24hrDesc = (events: readonly PolyEvent[]): PolyEvent[] =>
  [...events].sort((a, b) => b.volume24hr - a.volume24hr);

/** Only sports events have child events, so other events skip the lookup. */
export const hasSportsMarkets = (event: PolyEvent): boolean =>
  event.markets.some((m) => m.sportsMarketType !== "");

const TITLE_SEPARATOR = " - ";

/** Short tab label for a child event, e.g. "Exact Score". */
export function childEventLabel(childTitle: string, parentTitle: string): string {
  const prefix = `${parentTitle}${TITLE_SEPARATOR}`;
  if (parentTitle && childTitle.startsWith(prefix)) return childTitle.slice(prefix.length);
  const cut = childTitle.lastIndexOf(TITLE_SEPARATOR);
  return cut >= 0 ? childTitle.slice(cut + TITLE_SEPARATOR.length) : childTitle;
}

/** Gamma `events/keyset` query that also matches closed and v1/v2 events. */
export function buildEventLookupQuery(filter: Record<string, string>, limit: number): string {
  const query = new URLSearchParams({ ...filter, closed: "any", limit: String(limit) });
  query.append("version", "v1");
  query.append("version", "v2");
  return query.toString();
}

export interface GameTab {
  readonly slug: string;
  readonly label: string;
}

const MAIN_TAB_LABEL = "Game Lines";

/** Tabs linking a game's main event and its child events; empty when there are no children. */
export function buildGameTabs(main: PolyEvent, children: readonly PolyEvent[]): GameTab[] {
  if (children.length === 0) return [];
  return [
    { slug: main.slug, label: MAIN_TAB_LABEL },
    ...children.map((c) => ({ slug: c.slug, label: childEventLabel(c.title, main.title) })),
  ];
}
