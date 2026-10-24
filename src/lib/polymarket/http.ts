import { UPSTREAM_TIMEOUT_MS } from "./config";
import { viaRemoteProxy } from "./remote-proxy";

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/**
 * GETs JSON from an upstream URL with a timeout and typed errors.
 * When PM_REMOTE_PROXY_URL is set, Polymarket URLs go through that deployment's proxy.
 */
export async function fetchJson(url: URL | string): Promise<unknown> {
  const target = viaRemoteProxy(url, process.env.PM_REMOTE_PROXY_URL);
  let response: Response;
  try {
    response = await fetch(target, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new UpstreamError(`Polymarket API unreachable: ${reason}`, 502);
  }
  if (!response.ok) {
    throw new UpstreamError(`Polymarket API responded ${response.status}`, response.status);
  }
  return response.json();
}
