"use client";

import Link from "next/link";
import { MarketImage } from "@/components/markets/market-image";
import { Skeleton } from "@/components/ui/skeleton";
import { usePositions } from "@/hooks/use-portfolio";
import { formatCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PositionsTable({ user }: { user: string }) {
  const { data, isLoading, isError } = usePositions(user);

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <p className="py-8 text-center text-sm text-no">Could not load positions.</p>;
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted-foreground">No open positions.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-2 font-normal">Market</th>
            <th className="py-2 text-right font-normal">Avg → Now</th>
            <th className="py-2 text-right font-normal">Shares</th>
            <th className="py-2 text-right font-normal">Value</th>
            <th className="py-2 text-right font-normal">P&amp;L</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((p) => (
            <tr key={p.tokenId}>
              <td className="py-3 pr-4">
                <Link href={`/event/${p.eventSlug}`} className="flex items-center gap-3 hover:underline">
                  <MarketImage src={p.icon} alt="" size={32} />
                  <span className="min-w-0">
                    <span className="line-clamp-1">{p.title}</span>
                    <span className={cn("text-xs", p.outcome === "No" ? "text-no" : "text-yes")}>
                      {p.outcome}
                      {p.redeemable && " · Redeemable"}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="py-3 text-right tabular-nums">
                {formatCents(p.avgPrice)} → {formatCents(p.curPrice)}
              </td>
              <td className="py-3 text-right tabular-nums">{p.size.toFixed(2)}</td>
              <td className="py-3 text-right tabular-nums">{formatUsd(p.value)}</td>
              <td className={cn("py-3 text-right tabular-nums", p.pnl >= 0 ? "text-yes" : "text-no")}>
                {formatUsd(p.pnl)} ({p.percentPnl.toFixed(1)}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
