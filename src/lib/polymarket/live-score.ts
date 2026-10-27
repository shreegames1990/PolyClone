import { z } from "zod";
import { SPORTS_SIDEBAR } from "./groups";
import type { GameState, PolyEvent, Team } from "./types";

/** Soccer tags: the sidebar's Soccer group plus top-level UEFA competitions. */
const SOCCER_LEAGUE_SLUGS = new Set(["ucl", "unl"]);
const SOCCER_TAG_IDS: ReadonlySet<string> = new Set(
  SPORTS_SIDEBAR.sports
    .flatMap((node) => (node.slug === "soccer-group" ? (node.children ?? []) : SOCCER_LEAGUE_SLUGS.has(node.slug) ? [node] : []))
    .flatMap((node) => (node.tagId ? [node.tagId] : [])),
);

export function isSoccerEvent(event: PolyEvent): boolean {
  return event.tags.some((t) => SOCCER_TAG_IDS.has(t.id));
}

const optionalText = z.union([z.string(), z.number()]).nullish().transform((v) => (v == null ? "" : String(v)));

/** A `sport_result` frame from the sports socket (see `SportsResultEventSchema` in @polymarket/bindings). */
const sportResultSchema = z.object({
  gameId: z.number().int().positive(),
  live: z.boolean(),
  ended: z.boolean(),
  score: z.string(),
  period: optionalText,
  elapsed: optionalText,
});

export interface SportResult {
  readonly gameId: number;
  readonly state: GameState;
}

export function parseSportResult(raw: unknown): SportResult | null {
  const parsed = sportResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { gameId, ...state } = parsed.data;
  return { gameId, state };
}

const HALF_TIME = "HT";

/** "2H · 67'", "HT" or "FT"; "" before kick-off. */
export function clockLabel(state: GameState): string {
  if (state.ended) return "FT";
  if (!state.live) return "";
  if (state.period === HALF_TIME) return HALF_TIME;
  return [state.period, state.elapsed && `${state.elapsed}'`].filter(Boolean).join(" · ");
}

export interface Scoreline {
  readonly home: string;
  readonly away: string;
  readonly homeScore: string;
  readonly awayScore: string;
}

const GOALS = /^\s*(\d+)\s*-\s*(\d+)\s*$/;

const teamLabel = (team: Team) => team.abbreviation.toUpperCase() || team.name;

/**
 * Home and away teams with their goals. Assumes Gamma's "a-b" score is home-away; teams
 * are matched by Gamma's home/away names, else taken in `teams` order.
 */
export function scoreline(event: PolyEvent, state: GameState): Scoreline | null {
  const goals = GOALS.exec(state.score);
  const byName = (name: string | undefined) => (name ? event.teams.find((t) => t.name === name) : undefined);
  const home = byName(event.game?.homeTeam) ?? event.teams[0];
  const away = byName(event.game?.awayTeam) ?? event.teams.find((t) => t !== home);
  if (!goals || !home || !away) return null;
  return { home: teamLabel(home), away: teamLabel(away), homeScore: goals[1]!, awayScore: goals[2]! };
}
