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

/** Featured categories shown as tabs (Gamma tag slugs). */
export const CATEGORIES = [
  { slug: "", label: "All" },
  { slug: "politics", label: "Politics" },
  { slug: "sports", label: "Sports" },
  { slug: "crypto", label: "Crypto" },
  { slug: "economy", label: "Economy" },
  { slug: "geopolitics", label: "Geopolitics" },
  { slug: "tech", label: "Tech" },
  { slug: "culture", label: "Culture" },
  { slug: "world", label: "World" },
] as const;

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

/** Query for Gamma `GET /events/keyset`. `now` is injected for testability. */
export function buildEventsQuery({ sort, tag, cursor }: BrowseParams, now: number): string {
  const option = SORT_OPTIONS[sort];
  const query = new URLSearchParams({
    limit: String(EVENTS_PAGE_SIZE),
    closed: "false",
    order: option.order,
    ascending: String(option.ascending),
  });
  query.append("version", "v1");
  query.append("version", "v2");
  if (tag) query.set("tag_slug", tag);
  if (cursor) query.set("after_cursor", cursor);
  if (sort === "ending") {
    // Rounded to the hour so the cached query stays stable.
    query.set("end_date_min", new Date(Math.floor(now / HOUR_MS) * HOUR_MS).toISOString());
  }
  return query.toString();
}
