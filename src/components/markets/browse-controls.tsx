import { browseHref, SORT_OPTIONS, type BrowseParams, type SortKey } from "@/lib/polymarket/queries";
import { PillLink } from "@/components/ui/pill";

export function SortTabs({ current, basePath = "/" }: { current: BrowseParams; basePath?: string }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => (
        <PillLink key={key} size="xs" active={current.sort === key} href={browseHref({ ...current, sort: key, cursor: "" }, basePath)}>
          {SORT_OPTIONS[key].label}
        </PillLink>
      ))}
    </div>
  );
}
