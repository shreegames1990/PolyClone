import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EventView } from "@/components/event/event-view";
import { ErrorState } from "@/components/layout/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getChildEvents, getEventById, getEventBySlug } from "@/lib/polymarket/gamma";
import { buildGameTabs, hasSportsMarkets, isChildEvent, type GameTab } from "@/lib/polymarket/event-family";
import type { PolyEvent } from "@/lib/polymarket/types";
import { GroupSidebar } from "@/components/groups/group-sidebar";
import { activeSportsPath, findGroup } from "@/lib/polymarket/groups";
import { SPORTS_TAG_ID } from "@/lib/polymarket/queries";

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

  const tabs = await loadGameTabs(event);
  const view = <EventView event={event} initial={initial} tabs={tabs} />;
  const sports = findGroup("sports");
  const tagIds = event.tags.map((t) => t.id);
  if (!sports || !tagIds.includes(SPORTS_TAG_ID)) return view;

  // Sports events keep the sports sidebar, with the event's league highlighted (polymarket.com layout).
  return (
    <div className="xl:grid xl:grid-cols-[13rem_1fr] xl:gap-6">
      <aside className="hidden xl:sticky xl:top-[calc(var(--spacing-header)+1rem)] xl:block xl:max-h-[calc(100dvh-var(--spacing-header)-2rem)] xl:self-start xl:overflow-y-auto">
        <GroupSidebar group={sports} activeSub={activeSportsPath(tagIds) ?? undefined} />
      </aside>
      <div className="min-w-0">{view}</div>
    </div>
  );
}

/** Tabs for a game's main and child events. Optional: failures only hide the tabs. */
async function loadGameTabs(event: PolyEvent): Promise<GameTab[]> {
  try {
    const main = isChildEvent(event) ? await getEventById(event.parentEventId) : event;
    if (!main || !hasSportsMarkets(main)) return [];
    return buildGameTabs(main, await getChildEvents(main.id));
  } catch (error) {
    console.error("[event] game tabs failed", event.slug, error);
    return [];
  }
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
