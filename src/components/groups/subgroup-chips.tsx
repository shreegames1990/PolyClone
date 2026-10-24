import { PillLink } from "@/components/ui/pill";
import { SPORTS_SIDEBAR, subgroupHref, type Group, type RelatedTag } from "@/lib/polymarket/groups";

/** Mobile stand-in for the sidebar: a scrollable row of subgroup chips. */
export function SubgroupChips({
  group,
  activeSub,
  related = [],
}: {
  group: Group;
  activeSub: string | undefined;
  related?: readonly RelatedTag[];
}) {
  const items =
    group.sidebar === "sports"
      ? [...SPORTS_SIDEBAR.top, ...SPORTS_SIDEBAR.sports.flatMap((n) => n.children ?? [n])].map((n) => ({
          slug: n.slug,
          label: n.label === "All" ? (SPORTS_SIDEBAR.sports.find((p) => p.children?.includes(n))?.label ?? n.label) : n.label,
        }))
      : related.map((t) => ({ slug: t.slug, label: t.label }));

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
      <PillLink size="xs" href={subgroupHref(group.slug)} active={activeSub === undefined}>
        All
      </PillLink>
      {items.map((item) => (
        <PillLink key={item.slug} size="xs" href={subgroupHref(group.slug, item.slug)} active={activeSub === item.slug}>
          {item.label}
        </PillLink>
      ))}
    </div>
  );
}
