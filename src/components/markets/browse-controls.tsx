import Link from "next/link";
import { CATEGORIES, SORT_OPTIONS, type BrowseParams, type SortKey } from "@/lib/polymarket/queries";
import { cn } from "@/lib/utils";

function browseHref(params: Partial<BrowseParams>): string {
  const query = new URLSearchParams();
  if (params.tag) query.set("tag", params.tag);
  if (params.sort && params.sort !== "trending") query.set("sort", params.sort);
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return qs ? `/?${qs}` : "/";
}

export function CategoryTabs({ current }: { current: BrowseParams }) {
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
      {CATEGORIES.map((c) => (
        <Link
          key={c.slug}
          href={browseHref({ ...current, tag: c.slug, cursor: "" })}
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
            current.tag === c.slug && "bg-accent text-foreground",
          )}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}

export function SortTabs({ current }: { current: BrowseParams }) {
  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => (
        <Link
          key={key}
          href={browseHref({ ...current, sort: key, cursor: "" })}
          className={cn(
            "rounded-md border px-2.5 py-1 text-muted-foreground hover:text-foreground",
            current.sort === key && "border-primary text-foreground",
          )}
        >
          {SORT_OPTIONS[key].label}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ current, nextCursor }: { current: BrowseParams; nextCursor: string | null }) {
  const linkClass = "rounded-md border px-4 py-2 text-sm hover:bg-accent";
  return (
    <div className="flex justify-center gap-2">
      {current.cursor && (
        <Link href={browseHref({ ...current, cursor: "" })} className={linkClass}>
          Back to top
        </Link>
      )}
      {nextCursor && (
        <Link href={browseHref({ ...current, cursor: nextCursor })} className={linkClass}>
          Next page
        </Link>
      )}
    </div>
  );
}
