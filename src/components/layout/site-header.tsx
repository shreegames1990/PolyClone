"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BarChart3 } from "lucide-react";
import { SearchBox } from "./search-box";
import { NavLinks, StaticNavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <BarChart3 className="size-6 text-primary" />
          <span className="hidden sm:inline">Polymarket Clone</span>
        </Link>
        <SearchBox />
        <nav className="hidden items-center gap-1 md:flex">
          <Suspense fallback={<StaticNavLinks />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto">
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
