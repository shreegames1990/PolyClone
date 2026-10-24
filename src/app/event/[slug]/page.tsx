import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EventView } from "@/components/event/event-view";
import { ErrorState } from "@/components/layout/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventBySlug } from "@/lib/polymarket/gamma";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,200}$/i);

export default function EventPage(props: PageProps<"/event/[slug]">) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventContent {...props} />
    </Suspense>
  );
}

async function EventContent({ params, searchParams }: PageProps<"/event/[slug]">) {
  const parsed = slugSchema.safeParse((await params).slug);
  if (!parsed.success) notFound();

  const query = await searchParams;
  const result = await getEventBySlug(parsed.data).then(
    (event) => ({ ok: true as const, event }),
    (error: unknown) => {
      console.error("[event] load failed", parsed.data, error);
      return { ok: false as const };
    },
  );
  if (!result.ok) return <ErrorState />;
  if (!result.event) notFound();

  const event = result.event;
  const requested = event.markets.find((m) => m.id === query.market);
  const firstOpen = event.markets.find((m) => m.tradable) ?? event.markets[0];
  const initial = {
    marketId: (requested ?? firstOpen)?.id ?? "",
    outcomeIndex: query.side === "no" ? 1 : 0,
  };

  return <EventView event={event} initial={initial} />;
}

function EventSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
