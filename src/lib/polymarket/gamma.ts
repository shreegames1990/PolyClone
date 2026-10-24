import { cacheLife } from "next/cache";
import { z } from "zod";
import { POLYMARKET_HOSTS } from "./config";
import { fetchJson } from "./http";
import { normalizeEvent } from "./normalize";
import { buildEventsQuery, type BrowseParams } from "./queries";
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

export async function getEvents(params: BrowseParams): Promise<EventPage> {
  "use cache";
  cacheLife("seconds");
  const raw = await fetchJson(gammaUrl("events/keyset", buildEventsQuery(params, Date.now())));
  const page = keysetSchema.parse(raw);
  return { events: page.events.map(normalizeEvent), nextCursor: page.next_cursor ?? null };
}

/** Returns null when the slug does not exist. */
export async function getEventBySlug(slug: string): Promise<PolyEvent | null> {
  "use cache";
  cacheLife("seconds");
  const query = new URLSearchParams({ slug, closed: "any", limit: "1" });
  query.append("version", "v1");
  query.append("version", "v2");
  const [first] = keysetSchema.parse(await fetchJson(gammaUrl("events/keyset", query.toString()))).events;
  return first ? normalizeEvent(first) : null;
}

const searchSchema = z.object({ events: z.array(z.unknown()).catch([]) }).catch({ events: [] });

export async function searchEvents(query: string): Promise<PolyEvent[]> {
  "use cache";
  cacheLife("minutes");
  const params = new URLSearchParams({ q: query, limit_per_type: "20", events_status: "active" });
  const raw = await fetchJson(gammaUrl("public-search", params.toString()));
  return searchSchema.parse(raw).events.map(normalizeEvent);
}
