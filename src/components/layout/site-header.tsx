"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BarChart3 } from "lucide-react";
import { SearchBox } from "./search-box";
import { NavLinks, StaticNavLinks } from "./nav-links";
import { CategoryNav, StaticCategoryNav } from "./category-nav";
import { ThemeSwitcher } from "./theme-switcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base-100/95 backdrop-blur-md">
      <div className="mx-auto max-w-[90rem] px-4">
        <div className="flex h-16 items-center gap-3 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-field bg-primary">
              <BarChart3 className="size-4.5 text-primary-content" strokeWidth={2.5} />
            </span>
            <span className="hidden text-heading tracking-tight sm:inline">Polymarket Clone</span>
          </Link>
          <SearchBox />
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <Suspense fallback={<StaticNavLinks />}>
              <NavLinks />
            </Suspense>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <ThemeSwitcher />
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
          </div>
        </div>
        <nav aria-label="Categories" className="-mx-4 flex gap-6 overflow-x-auto px-4">
          <Suspense fallback={<StaticCategoryNav />}>
            <CategoryNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
