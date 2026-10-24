import Link from "next/link";
import { browseHref, SORT_OPTIONS, type BrowseParams, type SortKey } from "@/lib/polymarket/queries";
import { PillLink } from "@/components/ui/pill";

export function SortTabs({ current }: { current: BrowseParams }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => (
        <PillLink key={key} size="xs" active={current.sort === key} href={browseHref({ ...current, sort: key, cursor: "" })}>
          {SORT_OPTIONS[key].label}
        </PillLink>
      ))}
    </div>
  );
}

export function Pager({ current, nextCursor }: { current: BrowseParams; nextCursor: string | null }) {
  return (
    <div className="flex justify-center gap-2 pt-2">
      {current.cursor && (
        <Link href={browseHref({ ...current, cursor: "" })} className="btn btn-neutral">
          Back to top
        </Link>
      )}
      {nextCursor && (
        <Link href={browseHref({ ...current, cursor: nextCursor })} className="btn btn-neutral">
          Next page
        </Link>
      )}
    </div>
  );
}
