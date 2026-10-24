import { POLYMARKET_HOSTS, type PolymarketService } from "./config";

const SERVICE_BY_ORIGIN = new Map(
  Object.entries(POLYMARKET_HOSTS).map(([service, host]) => [new URL(host).origin, service as PolymarketService]),
);

function parseProxyBase(base: string): URL {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`PM_REMOTE_PROXY_URL is not a valid URL: "${base}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`PM_REMOTE_PROXY_URL must use http or https: "${base}"`);
  }
  return url;
}

/**
 * Rewrites a direct Polymarket API URL to go through another deployment's
 * `/api/pm` proxy. Used for local development where Polymarket is unreachable.
 */
export function viaRemoteProxy(url: URL | string, proxyBase: string | undefined): string {
  const target = new URL(url);
  if (!proxyBase) return target.toString();
  const service = SERVICE_BY_ORIGIN.get(target.origin);
  if (!service) return target.toString();

  const base = parseProxyBase(proxyBase);
  const prefix = base.pathname.replace(/\/+$/, "");
  return `${base.origin}${prefix}/api/pm/${service}${target.pathname}${target.search}`;
}
