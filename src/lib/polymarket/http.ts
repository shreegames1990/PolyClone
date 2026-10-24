import { UPSTREAM_TIMEOUT_MS } from "./config";

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** GETs JSON from an upstream URL with a timeout and typed errors. */
export async function fetchJson(url: URL | string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
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
