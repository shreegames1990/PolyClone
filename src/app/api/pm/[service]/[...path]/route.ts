import { buildUpstreamUrl } from "@/lib/polymarket/proxy";
import { fetchJson, UpstreamError } from "@/lib/polymarket/http";

const CDN_CACHE = "public, s-maxage=10, stale-while-revalidate=30";

/** Read-only proxy to allowlisted Polymarket endpoints (avoids browser CORS). */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/pm/[service]/[...path]">,
) {
  const { service, path } = await params;
  const upstream = buildUpstreamUrl(service, path, new URL(request.url).search);
  if (!upstream) {
    return Response.json({ success: false, data: null, error: "Endpoint not allowed" }, { status: 404 });
  }

  try {
    const data = await fetchJson(upstream);
    return Response.json(data, { headers: { "cache-control": CDN_CACHE } });
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 500;
    console.error("[pm-proxy]", upstream.toString(), error);
    return Response.json(
      { success: false, data: null, error: "Could not load data from Polymarket." },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
