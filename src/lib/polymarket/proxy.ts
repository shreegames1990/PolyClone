import { POLYMARKET_HOSTS, PROXY_ALLOWLIST, type PolymarketService } from "./config";

/** Caps page size so the proxy cannot be used for bulk scraping. */
const MAX_LIMIT = 100;
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/;
const NUMERIC_ID = /^\d+$/;
const ID_PLACEHOLDER = ":id";

/** True when `segments` match an allowlist entry (see PROXY_ALLOWLIST). */
function matchesEntry(entry: string, segments: readonly string[]): boolean {
  const parts = entry.split("/");
  if (parts.includes(ID_PLACEHOLDER)) {
    return (
      parts.length === segments.length &&
      parts.every((part, i) => (part === ID_PLACEHOLDER ? NUMERIC_ID.test(segments[i]!) : part === segments[i]))
    );
  }
  const path = segments.join("/");
  if (path === entry) return true;
  if (!path.startsWith(`${entry}/`)) return false;
  return path.slice(entry.length + 1).split("/").length === 1;
}

function isService(value: string): value is PolymarketService {
  return Object.hasOwn(POLYMARKET_HOSTS, value);
}

/**
 * Maps a proxy request to an upstream Polymarket URL, or null when the path
 * is not an allowlisted read-only endpoint.
 */
export function buildUpstreamUrl(
  service: string,
  segments: readonly string[],
  search: string,
): URL | null {
  if (!isService(service) || segments.length === 0) return null;
  if (!segments.every((s) => SAFE_SEGMENT.test(s) && s !== "." && s !== "..")) return null;

  if (!PROXY_ALLOWLIST[service].some((entry) => matchesEntry(entry, segments))) return null;
  const path = segments.join("/");

  const url = new URL(`${POLYMARKET_HOSTS[service]}/${path}`);
  url.search = search;
  const limit = Number(url.searchParams.get("limit"));
  if (url.searchParams.has("limit") && !(limit > 0 && limit <= MAX_LIMIT)) url.searchParams.set("limit", String(MAX_LIMIT));
  return url;
}
