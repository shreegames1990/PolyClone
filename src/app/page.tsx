import { Suspense } from "react";
import { CategoryTabs, Pager, SortTabs } from "@/components/markets/browse-controls";
import { EventGrid, EventGridSkeleton } from "@/components/markets/event-grid";
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
      <CategoryTabs current={params} />
      <SortTabs current={params} />
      {result.ok ? (
        <>
          <EventGrid events={result.events} />
          <Pager current={params} nextCursor={result.nextCursor} />
        </>
      ) : (
        <ErrorState />
      )}
    </div>
  );
}
