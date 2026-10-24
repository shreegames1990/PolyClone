import { z } from "zod";

export const EVENTS_PAGE_SIZE = 24;

const HOUR_MS = 3_600_000;

export const SORT_OPTIONS = {
  trending: { label: "Trending", order: "volume24hr", ascending: false },
  volume: { label: "Total volume", order: "volume", ascending: false },
  liquidity: { label: "Liquidity", order: "liquidity", ascending: false },
  new: { label: "Newest", order: "startDate", ascending: false },
  ending: { label: "Ending soon", order: "endDate", ascending: true },
} as const;

export type SortKey = keyof typeof SORT_OPTIONS;

export interface BrowseParams {
  readonly sort: SortKey;
  readonly tag: string;
  /** Gamma keyset cursor; empty for the first page. */
  readonly cursor: string;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const browseSchema = z.object({
  sort: z.enum(Object.keys(SORT_OPTIONS) as [SortKey, ...SortKey[]]).catch("trending"),
  tag: z.string().regex(/^[a-z0-9-]{1,64}$/).catch(""),
  cursor: z.string().regex(/^[A-Za-z0-9_=+/-]{1,512}$/).catch(""),
});

export function parseBrowseParams(params: RawSearchParams): BrowseParams {
  return browseSchema.parse({
    sort: first(params.sort),
    tag: first(params.tag) ?? "",
    cursor: first(params.cursor) ?? "",
  });
}

/** Gamma tags behind the Sports group's Live and Futures views. */
export const SPORTS_TAG_ID = "1";
export const GAMES_TAG_ID = "100639";
/** Live games may run past their scheduled end; older "live" flags are stale. */
const LIVE_GRACE_MS = 6 * HOUR_MS;

/** Which events a browse view shows; overrides the `tag` slug when given. */
export type EventFilter =
  | { readonly kind: "tag"; readonly tagId: string }
  | { readonly kind: "slug"; readonly slug: string }
  | { readonly kind: "live" }
  | { readonly kind: "futures" };

const floorToHour = (ms: number) => new Date(Math.floor(ms / HOUR_MS) * HOUR_MS).toISOString();

function applyFilter(query: URLSearchParams, filter: EventFilter, now: number): void {
  switch (filter.kind) {
    case "tag":
      query.set("tag_id", filter.tagId);
      break;
    case "slug":
      query.set("tag_slug", filter.slug);
      break;
    case "live":
      query.set("tag_id", GAMES_TAG_ID);
      query.set("live", "true");
      query.set("end_date_min", floorToHour(now - LIVE_GRACE_MS));
      break;
    case "futures":
      query.set("tag_id", SPORTS_TAG_ID);
      query.set("exclude_tag_id", GAMES_TAG_ID);
      break;
  }
}

/** Query for Gamma `GET /events/keyset`. `now` is injected for testability. */
export function buildEventsQuery({ sort, tag, cursor }: BrowseParams, now: number, filter?: EventFilter): string {
  const option = SORT_OPTIONS[sort];
  const query = new URLSearchParams({
    limit: String(EVENTS_PAGE_SIZE),
    closed: "false",
    order: option.order,
    ascending: String(option.ascending),
  });
  query.append("version", "v1");
  query.append("version", "v2");
  if (filter) applyFilter(query, filter, now);
  else if (tag) query.set("tag_slug", tag);
  if (cursor) query.set("after_cursor", cursor);
  if (sort === "ending") {
    // Rounded to the hour so the cached query stays stable.
    query.set("end_date_min", floorToHour(now));
  }
  return query.toString();
}

/** URL for a browse view under `basePath`; default values are omitted so paths stay canonical. */
export function browseHref(params: Partial<BrowseParams>, basePath = "/"): string {
  const query = new URLSearchParams();
  if (params.tag) query.set("tag", params.tag);
  if (params.sort && params.sort !== "trending") query.set("sort", params.sort);
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
