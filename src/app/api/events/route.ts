import { getEvents } from "@/lib/polymarket/gamma";
import { parseEventPageRequest, resolvePageFilter } from "@/lib/polymarket/event-pages";

/** Next page of a browse view for infinite scroll (see InfiniteEventGrid). */
const fail = (status: number, error: string) => Response.json({ success: false, data: null, error }, { status });

export async function GET(request: Request) {
  const parsed = parseEventPageRequest(new URL(request.url).searchParams);
  if (!parsed) return fail(400, "Invalid request");
  const resolved = resolvePageFilter(parsed.query);
  if (!resolved) return fail(404, "Unknown category");

  const { query, cursor } = parsed;
  try {
    const page = await getEvents({ sort: query.sort, tag: query.tag, cursor }, resolved.filter);
    return Response.json({ success: true, data: page, error: null });
  } catch (error) {
    console.error("[events-api] page failed", query, error);
    return fail(502, "Could not load more markets.");
  }
}
