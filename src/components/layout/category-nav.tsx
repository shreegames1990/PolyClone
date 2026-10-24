"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles, TrendingUp } from "lucide-react";
import { browseHref, parseBrowseParams } from "@/lib/polymarket/queries";
import { GROUPS, subgroupHref } from "@/lib/polymarket/groups";
import { cn } from "@/lib/utils";


const linkClass =
  "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-body-sm font-medium transition-colors";
const activeClass = "border-base-content text-base-content";
const idleClass = "border-transparent text-base-content/60 hover:text-base-content";

function NavItem({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(linkClass, active ? activeClass : idleClass)}>
      {children}
    </Link>
  );
}

function Items({ sort, pathname }: { sort: string; pathname: string }) {
  const onHome = pathname === "/";
  return (
    <>
      <NavItem href={browseHref({})} active={onHome && sort === "trending"}>
        <TrendingUp className="size-4" /> Trending
      </NavItem>
      <NavItem href={browseHref({ sort: "new" })} active={onHome && sort === "new"}>
        <Sparkles className="size-4" /> New
      </NavItem>
      <span aria-hidden className="my-3 w-px shrink-0 bg-base-300" />
      {GROUPS.map((g) => {
        const href = subgroupHref(g.slug);
        return (
          <NavItem key={g.slug} href={href} active={pathname === href || pathname.startsWith(`${href}/`)}>
            {g.label}
          </NavItem>
        );
      })}
    </>
  );
}

/** Second header row: Trending, New, then the groups (Polymarket layout). */
export function CategoryNav() {
  const params = parseBrowseParams(Object.fromEntries(useSearchParams()));
  return <Items sort={params.sort} pathname={usePathname()} />;
}

/** Suspense fallback before search params are known. */
export function StaticCategoryNav() {
  return <Items sort="" pathname="" />;
}
