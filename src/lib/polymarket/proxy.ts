import { POLYMARKET_HOSTS, PROXY_ALLOWLIST, type PolymarketService } from "./config";

/** Caps page size so the proxy cannot be used for bulk scraping. */
const MAX_LIMIT = 100;
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/;

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

  const path = segments.join("/");
  const allowed = PROXY_ALLOWLIST[service].some((prefix) => {
    if (path === prefix) return true;
    if (!path.startsWith(`${prefix}/`)) return false;
    return path.slice(prefix.length + 1).split("/").length === 1;
  });
  if (!allowed) return null;

  const url = new URL(`${POLYMARKET_HOSTS[service]}/${path}`);
  url.search = search;
  const limit = Number(url.searchParams.get("limit"));
  if (url.searchParams.has("limit") && !(limit > 0 && limit <= MAX_LIMIT)) url.searchParams.set("limit", String(MAX_LIMIT));
  return url;
}
