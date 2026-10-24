import type { PolymarketService } from "./config";

/** Browser-side GET through our read-only proxy (`/api/pm/...`). */
export async function pmGet(
  service: PolymarketService,
  path: string,
  query: Record<string, string> = {},
): Promise<unknown> {
  const qs = new URLSearchParams(query).toString();
  const response = await fetch(`/api/pm/${service}/${path}${qs ? `?${qs}` : ""}`);
  if (!response.ok) {
    throw Object.assign(new Error("Could not load data from Polymarket."), { status: response.status });
  }
  return response.json();
}
