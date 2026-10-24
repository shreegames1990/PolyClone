"use client";

import { MarketImage } from "@/components/markets/market-image";
import { formatCents, formatCompactUsd, formatPercent, formatSignedPercent } from "@/lib/format";
import type { Market } from "@/lib/polymarket/types";
import { cn } from "@/lib/utils";

export interface Selection {
  readonly marketId: string;
  readonly outcomeIndex: number;
}

export function MarketList({
  markets,
  selection,
  onSelect,
}: {
  markets: readonly Market[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
}) {
  return (
    <div className="divide-y rounded-xl border">
      {markets.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap",
            selection.marketId === m.id && "bg-accent/40",
            m.closed && "opacity-60",
          )}
        >
          <MarketImage src={m.image} alt="" size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{m.label}</p>
            <p className="text-xs text-muted-foreground">{formatCompactUsd(m.volume)} Vol.</p>
          </div>
          <div className="w-20 text-right">
            <p className="text-lg font-semibold">{formatPercent(m.outcomes[0]?.price)}</p>
            {m.oneDayPriceChange !== 0 && (
              <p className={cn("text-xs", m.oneDayPriceChange > 0 ? "text-yes" : "text-no")}>
                {formatSignedPercent(m.oneDayPriceChange)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {m.outcomes.slice(0, 2).map((o, i) => (
              <button
                key={o.tokenId || o.name}
                type="button"
                disabled={!m.tradable}
                onClick={() => onSelect({ marketId: m.id, outcomeIndex: i })}
                className={cn(
                  "w-28 rounded-md px-2 py-2 text-sm font-medium disabled:cursor-not-allowed",
                  i === 0 ? "bg-yes/15 text-yes hover:bg-yes/25" : "bg-no/15 text-no hover:bg-no/25",
                  selection.marketId === m.id && selection.outcomeIndex === i && "ring-2 ring-current",
                )}
              >
                {o.name} {formatCents(o.price)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
