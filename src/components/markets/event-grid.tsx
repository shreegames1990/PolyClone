import { EventCard } from "./event-card";
import { MasonryGrid, MasonryItem } from "./masonry-grid";
import { cardSize } from "@/lib/polymarket/card-size";
import { Skeleton } from "@/components/ui/skeleton";
import type { PolyEvent } from "@/lib/polymarket/types";

/** Uniform grid for loading skeletons (cards themselves use the masonry grid). */
export const EVENT_GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function EventGrid({ events }: { events: readonly PolyEvent[] }) {
  if (events.length === 0) {
    return <p className="py-16 text-center text-body-sm text-base-content/60">No markets found.</p>;
  }
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

export function EventGridSkeleton() {
  return (
    <div className={EVENT_GRID_CLASS}>
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="h-48 rounded-box" />
      ))}
    </div>
  );
}
