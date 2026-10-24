import { EventCard } from "./event-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PolyEvent } from "@/lib/polymarket/types";

export function EventGrid({ events }: { events: readonly PolyEvent[] }) {
  if (events.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">No markets found.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export function EventGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
