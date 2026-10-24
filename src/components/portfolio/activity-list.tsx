"use client";

import Link from "next/link";
import { MarketImage } from "@/components/markets/market-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/hooks/use-portfolio";
import { formatCents, formatUsd } from "@/lib/format";

const timeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function ActivityList({ user }: { user: string }) {
  const { data, isLoading, isError } = useActivity(user);

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <p className="py-8 text-center text-sm text-no">Could not load activity.</p>;
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ul className="divide-y text-sm">
      {data.map((a) => (
        <li key={`${a.txHash}-${a.timestamp}-${a.outcome}`} className="flex items-center gap-3 py-3">
          <MarketImage src={a.icon} alt="" size={32} />
          <div className="min-w-0 flex-1">
            <Link href={`/event/${a.eventSlug}`} className="line-clamp-1 hover:underline">
              {a.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {a.type === "TRADE" ? `${a.side === "BUY" ? "Bought" : "Sold"} ${a.size.toFixed(2)} ${a.outcome} at ${formatCents(a.price)}` : a.type}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular-nums">{formatUsd(a.usdcSize)}</p>
            <p className="text-xs text-muted-foreground">{timeFormatter.format(a.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
