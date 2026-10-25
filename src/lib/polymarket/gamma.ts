import { cacheLife } from "next/cache";
import { z } from "zod";
import { POLYMARKET_HOSTS } from "./config";
import { fetchJson } from "./http";
import { normalizeEvent } from "./normalize";
import { buildEventLookupQuery, byVolume24hrDesc, withoutChildEvents } from "./event-family";
import { buildEventsQuery, type BrowseParams, type EventFilter } from "./queries";
import { parseRelatedTags, type RelatedTag } from "./groups";
import type { PolyEvent } from "./types";

const gammaUrl = (path: string, query = "") =>
  `${POLYMARKET_HOSTS.gamma}/${path}${query ? `?${query}` : ""}`;

const keysetSchema = z
  .object({ events: z.array(z.unknown()).catch([]), next_cursor: z.string().nullish() })
  .catch({ events: [] });

export interface EventPage {
  readonly events: PolyEvent[];
  readonly nextCursor: string | null;
}

/**
 * Browse lists. Gamma can take 15-25s on a cache miss for large tags, so lists are
 * cached for minutes: visitors get the cached page while it refreshes in the background.
 */
export async function getEvents(params: BrowseParams, filter?: EventFilter): Promise<EventPage> {
  "use cache";
  cacheLife("minutes");
  const raw = await fetchJson(gammaUrl("events/keyset", buildEventsQuery(params, Date.now(), filter)));
  const page = keysetSchema.parse(raw);
  const events = withoutChildEvents(page.events.map(normalizeEvent));
  // Live games are fetched unordered (see buildEventsQuery), so order this page here.
  return { events: filter?.kind === "live" ? byVolume24hrDesc(events) : events, nextCursor: page.next_cursor ?? null };
}

/** Returns null when the slug does not exist. */
export async function getEventBySlug(slug: string): Promise<PolyEvent | null> {
  "use cache";
  cacheLife("seconds");
  return findOneEvent({ slug });
}

/** Returns null when no event has this id. */
export async function getEventById(id: string): Promise<PolyEvent | null> {
  "use cache";
  cacheLife("seconds");
  return findOneEvent({ id });
}

/** Max children per game seen on Gamma is ~10; one page covers them all. */
const MAX_CHILD_EVENTS = 50;

/** A game's child events ("Exact Score", "More Markets", …) in Gamma order. */
export async function getChildEvents(parentId: string): Promise<PolyEvent[]> {
  "use cache";
  cacheLife("seconds");
  const query = buildEventLookupQuery({ parent_event_id: parentId }, MAX_CHILD_EVENTS);
  return keysetSchema.parse(await fetchJson(gammaUrl("events/keyset", query))).events.map(normalizeEvent);
}

async function findOneEvent(filter: Record<string, string>): Promise<PolyEvent | null> {
  const query = buildEventLookupQuery(filter, 1);
  const [first] = keysetSchema.parse(await fetchJson(gammaUrl("events/keyset", query))).events;
  return first ? normalizeEvent(first) : null;
}

const searchSchema = z.object({ events: z.array(z.unknown()).catch([]) }).catch({ events: [] });

export async function searchEvents(query: string): Promise<PolyEvent[]> {
  "use cache";
  cacheLife("minutes");
  const params = new URLSearchParams({ q: query, limit_per_type: "20", events_status: "active" });
  const raw = await fetchJson(gammaUrl("public-search", params.toString()));
  return withoutChildEvents(searchSchema.parse(raw).events.map(normalizeEvent));
}

/** Sidebar subgroups for a group: Gamma's active related tags, in Gamma's order. */
export async function getRelatedTags(tagId: string): Promise<RelatedTag[]> {
  "use cache";
  cacheLife("hours");
  const query = new URLSearchParams({ status: "active", omit_empty: "true" }).toString();
  return parseRelatedTags(await fetchJson(gammaUrl(`tags/${tagId}/related-tags/tags`, query)));
}
