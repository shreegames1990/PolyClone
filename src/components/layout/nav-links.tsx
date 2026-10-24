"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

const linkClass = "rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground";

/** Static links used as the Suspense fallback before the pathname is known. */
export function StaticNavLinks() {
  return (
    <>
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass}>
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={cn(linkClass, pathname === item.href && "text-foreground")}>
          {item.label}
        </Link>
      ))}
    </>
  );
}
