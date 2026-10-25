import { Suspense } from "react";
import { SortTabs } from "@/components/markets/browse-controls";
import { EventGridSkeleton } from "@/components/markets/event-grid";
import { InfiniteEventGrid } from "@/components/markets/infinite-event-grid";
import { ErrorState } from "@/components/layout/error-state";
import { getEvents } from "@/lib/polymarket/gamma";
import { parseBrowseParams } from "@/lib/polymarket/queries";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<EventGridSkeleton />}>
      <Browse searchParams={searchParams} />
    </Suspense>
  );
}

async function Browse({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = parseBrowseParams(await searchParams);
  const result = await getEvents(params).then(
    (page) => ({ ok: true as const, ...page }),
    (error: unknown) => {
      console.error("[home] getEvents failed", error);
      return { ok: false as const };
    },
  );

  return (
    <div className="space-y-5">
      <SortTabs current={params} />
      {result.ok ? (
        <InfiniteEventGrid
          key={`${params.sort}|${params.tag}|${params.cursor}`}
          initialEvents={result.events}
          initialCursor={result.nextCursor}
          query={{ sort: params.sort, tag: params.tag }}
        />
      ) : (
        <ErrorState />
      )}
    </div>
  );
}
