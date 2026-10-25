"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { EventCard } from "./event-card";
import { MasonryGrid, MasonryItem } from "./masonry-grid";
import { cardSize } from "@/lib/polymarket/card-size";
import { SidebarIcon } from "@/components/groups/sidebar-icon";
import { eventsPageUrl, mergeEventPages, type EventPageQuery } from "@/lib/polymarket/event-pages";
import { groupLiveEvents } from "@/lib/polymarket/live-groups";
import type { PolyEvent } from "@/lib/polymarket/types";

/** Start loading this far before the end of the list scrolls into view. */
const PREFETCH_MARGIN = "600px";

// /api/events returns our own normalized events; check the envelope, trust the event shape.
const pageSchema = z.object({
  success: z.literal(true),
  data: z.object({ events: z.array(z.custom<PolyEvent>((v) => typeof v === "object" && v !== null)), nextCursor: z.string().nullable() }),
});

type Status = "idle" | "loading" | "error";

/**
 * Event grid that loads the next page as the user scrolls (infinite scroll).
 * The first page is rendered on the server; later pages come from /api/events.
 * `groupBySport` (Live) shows one section per league, latest end time first.
 */
export function InfiniteEventGrid({
  initialEvents,
  initialCursor,
  query,
  groupBySport = false,
}: {
  initialEvents: readonly PolyEvent[];
  initialCursor: string | null;
  query: EventPageQuery;
  groupBySport?: boolean;
}) {
  const [events, setEvents] = useState<readonly PolyEvent[]>(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<Status>("idle");
  const inFlight = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    try {
      const response = await fetch(eventsPageUrl(query, cursor), { headers: { accept: "application/json" } });
      const page = pageSchema.parse(await response.json()).data;
      setEvents((current) => mergeEventPages(current, page.events));
      setCursor(page.nextCursor);
      setStatus("idle");
    } catch (error) {
      console.error("[infinite-grid] next page failed", error);
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [cursor, query]);

  // A new observer per cursor: if the end is still visible after a short page, it fires again.
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !cursor || status === "error") return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadMore(), {
      rootMargin: PREFETCH_MARGIN,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, status, loadMore]);

  if (events.length === 0) {
    return <p className="py-16 text-center text-body-sm text-base-content/60">No markets found.</p>;
  }

  return (
    <div className="space-y-6">
      {groupBySport ? <SportSections events={events} /> : <CardGrid events={events} />}
      <div ref={sentinel} aria-live="polite" className="flex min-h-12 items-center justify-center text-body-sm text-base-content/60">
        {status === "loading" && <span className="loading loading-dots loading-md" aria-label="Loading more markets" />}
        {status === "error" && (
          <span className="flex items-center gap-3">
            Could not load more markets.
            <button type="button" className="btn btn-sm btn-neutral" onClick={() => void loadMore()}>
              Retry
            </button>
          </span>
        )}
        {status === "idle" && !cursor && "You've seen all markets here."}
      </div>
    </div>
  );
}

function CardGrid({ events }: { events: readonly PolyEvent[] }) {
  return (
    <MasonryGrid>
      {events.map((event) => (
        <MasonryItem key={event.id} wide={cardSize(event) === "wide"}>
          <EventCard event={event} />
        </MasonryItem>
      ))}
    </MasonryGrid>
  );
}

/** Regrouped on every render so events from later pages land in their league's section. */
function SportSections({ events }: { events: readonly PolyEvent[] }) {
  return (
    <div className="space-y-8">
      {groupLiveEvents(events).map((group) => (
        <section key={group.key} aria-label={group.label} className="space-y-3">
          <h2 className="flex items-center gap-2 text-heading">
            {group.node && <SidebarIcon node={group.node} />}
            {group.label}
            <span className="badge badge-sm border-none bg-base-300 font-semibold text-base-content/70">{group.events.length}</span>
          </h2>
          <CardGrid events={group.events} />
        </section>
      ))}
    </div>
  );
}
