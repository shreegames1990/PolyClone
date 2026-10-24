"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles, TrendingUp } from "lucide-react";
import { browseHref, CATEGORIES, parseBrowseParams } from "@/lib/polymarket/queries";
import { cn } from "@/lib/utils";

const TOPICS = CATEGORIES.filter((c) => c.slug !== "");

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

function Items({ tag, sort, onHome }: { tag: string; sort: string; onHome: boolean }) {
  return (
    <>
      <NavItem href={browseHref({})} active={onHome && !tag && sort === "trending"}>
        <TrendingUp className="size-4" /> Trending
      </NavItem>
      <NavItem href={browseHref({ sort: "new" })} active={onHome && !tag && sort === "new"}>
        <Sparkles className="size-4" /> New
      </NavItem>
      <span aria-hidden className="my-3 w-px shrink-0 bg-base-300" />
      {TOPICS.map((c) => (
        <NavItem key={c.slug} href={browseHref({ tag: c.slug })} active={onHome && tag === c.slug}>
          {c.label}
        </NavItem>
      ))}
    </>
  );
}

/** Second header row: Trending, New, then topic categories (Polymarket layout). */
export function CategoryNav() {
  const params = parseBrowseParams(Object.fromEntries(useSearchParams()));
  return <Items tag={params.tag} sort={params.sort} onHome={usePathname() === "/"} />;
}

/** Suspense fallback before search params are known. */
export function StaticCategoryNav() {
  return <Items tag="" sort="" onHome={false} />;
}
