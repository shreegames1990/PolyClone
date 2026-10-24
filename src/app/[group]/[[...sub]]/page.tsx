import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Pager, SortTabs } from "@/components/markets/browse-controls";
import { EventGrid, EventGridSkeleton } from "@/components/markets/event-grid";
import { ErrorState } from "@/components/layout/error-state";
import { GroupSidebar } from "@/components/groups/group-sidebar";
import { SubgroupChips } from "@/components/groups/subgroup-chips";
import { getEvents, getRelatedTags } from "@/lib/polymarket/gamma";
import { findGroup, resolveSubgroup, subgroupHref, type Group, type RelatedTag } from "@/lib/polymarket/groups";
import { parseBrowseParams } from "@/lib/polymarket/queries";

/** /politics, /sports, /sports/la-liga, /politics/trump… */
export default function GroupPage(props: PageProps<"/[group]/[[...sub]]">) {
  return (
    <Suspense fallback={<EventGridSkeleton />}>
      <GroupContent {...props} />
    </Suspense>
  );
}

/** Related tags are optional: on failure the sidebar shows only "All". */
async function loadRelated(group: Group): Promise<RelatedTag[]> {
  if (group.sidebar !== "related") return [];
  return getRelatedTags(group.tagId).catch((error: unknown) => {
    console.error("[group] related tags failed", group.slug, error);
    return [];
  });
}

async function GroupContent({ params, searchParams }: PageProps<"/[group]/[[...sub]]">) {
  const { group: groupSlug, sub: subPath } = await params;
  const group = findGroup(groupSlug);
  if (!group || (subPath?.length ?? 0) > 1) notFound();
  const activeSub = subPath?.[0];

  const related = await loadRelated(group);
  const resolved = resolveSubgroup(group, activeSub, related);
  if (!resolved) notFound();

  const browse = parseBrowseParams(await searchParams);
  const basePath = subgroupHref(group.slug, activeSub);
  const result = await getEvents(browse, resolved.filter).then(
    (page) => ({ ok: true as const, ...page }),
    (error: unknown) => {
      console.error("[group] getEvents failed", basePath, error);
      return { ok: false as const };
    },
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <aside className="hidden lg:sticky lg:top-[calc(var(--spacing-header)+1rem)] lg:block lg:max-h-[calc(100dvh-var(--spacing-header)-2rem)] lg:self-start lg:overflow-y-auto">
        <GroupSidebar group={group} activeSub={activeSub} related={related} />
      </aside>
      <section className="min-w-0 space-y-4">
        <h1 className="text-title">{resolved.label}</h1>
        <SubgroupChips group={group} activeSub={activeSub} related={related} />
        <SortTabs current={browse} basePath={basePath} />
        {result.ok ? (
          <>
            <EventGrid events={result.events} />
            <Pager current={browse} nextCursor={result.nextCursor} basePath={basePath} />
          </>
        ) : (
          <ErrorState />
        )}
      </section>
    </div>
  );
}
