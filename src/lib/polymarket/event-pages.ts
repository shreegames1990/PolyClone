import { findGroup, resolveSubgroup } from "./groups";
import { parseBrowseParams, type EventFilter, type SortKey } from "./queries";
import type { PolyEvent } from "./types";

/**
 * Infinite scroll: the browser asks /api/events for the next page of a browse view.
 * The query names a view (home tag/sort, or a group and subgroup); the server resolves
 * the Gamma filter itself, so the client never sends raw filters.
 */
export interface EventPageQuery {
  readonly group?: string;
  readonly sub?: string;
  readonly sort: SortKey;
  readonly tag: string;
}

export const EVENTS_API_PATH = "/api/events";

const SLUG = /^[a-z0-9-]{1,64}$/;

export function eventsPageUrl(query: EventPageQuery, cursor: string): string {
  const params = new URLSearchParams();
  if (query.group) params.set("group", query.group);
  if (query.sub) params.set("sub", query.sub);
  if (query.sort !== "trending") params.set("sort", query.sort);
  if (query.tag) params.set("tag", query.tag);
  params.set("cursor", cursor);
  return `${EVENTS_API_PATH}?${params.toString()}`;
}

/** Validates an /api/events request; null when the cursor is missing or a slug is malformed. */
export function parseEventPageRequest(params: URLSearchParams): { query: EventPageQuery; cursor: string } | null {
  const browse = parseBrowseParams(Object.fromEntries(params));
  const group = params.get("group") ?? undefined;
  const sub = params.get("sub") ?? undefined;
  if (!browse.cursor) return null;
  if (group !== undefined && !SLUG.test(group)) return null;
  if (sub !== undefined && (group === undefined || !SLUG.test(sub))) return null;

  const query: EventPageQuery = {
    ...(group ? { group } : {}),
    ...(sub ? { sub } : {}),
    sort: browse.sort,
    tag: browse.tag,
  };
  return { query, cursor: browse.cursor };
}

/** The Gamma filter for a view; null for an unknown group or subgroup. */
export function resolvePageFilter(query: EventPageQuery): { filter: EventFilter | undefined } | null {
  if (!query.group) return { filter: undefined };
  const group = findGroup(query.group);
  const resolved = group ? resolveSubgroup(group, query.sub) : null;
  return resolved ? { filter: resolved.filter } : null;
}

/** Appends a page, skipping events already shown (keyset pages can overlap after refreshes). */
export function mergeEventPages(existing: readonly PolyEvent[], incoming: readonly PolyEvent[]): PolyEvent[] {
  const seen = new Set(existing.map((e) => e.id));
  return [...existing, ...incoming.filter((e) => !seen.has(e.id))];
}
