"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Markets", icon: LayoutGrid },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
] as const;

const linkClass =
  "btn btn-ghost btn-sm gap-1.5 text-label font-medium text-base-content/70 hover:text-base-content";

function Links({ activeHref }: { activeHref?: string }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={cn(linkClass, activeHref === href && "text-foreground")}>
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </>
  );
}

/** Static links used as the Suspense fallback before the pathname is known. */
export function StaticNavLinks() {
  return <Links />;
}

export function NavLinks() {
  return <Links activeHref={usePathname()} />;
}
