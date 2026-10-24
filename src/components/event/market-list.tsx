"use client";

import { MarketImage } from "@/components/markets/market-image";
import { formatCents, formatCompactUsd, formatPercent, formatSignedPercent } from "@/lib/format";
import type { Market } from "@/lib/polymarket/types";
import { OutcomeButton, toneForIndex } from "@/components/ui/outcome-button";
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
    <div className="card divide-y divide-border overflow-hidden border border-border bg-base-200">
      {markets.map((m) => {
        const selected = selection.marketId === m.id;
        return (
          <div
            key={m.id}
            className={cn(
              "flex flex-wrap items-center gap-3 p-4 transition-colors sm:flex-nowrap",
              selected ? "bg-base-300/70" : "hover:bg-base-300/40",
              m.closed && "opacity-60",
            )}
          >
            <MarketImage src={m.image} alt="" size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium">{m.label}</p>
              <p className="text-caption text-base-content/60 tabular-nums">{formatCompactUsd(m.volume)} Vol.</p>
            </div>
            <div className="w-20 text-right">
              <p className="text-heading tabular-nums">{formatPercent(m.outcomes[0]?.price)}</p>
              {m.oneDayPriceChange !== 0 && (
                <p className={cn("text-caption tabular-nums", m.oneDayPriceChange > 0 ? "text-yes" : "text-no")}>
                  {formatSignedPercent(m.oneDayPriceChange)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {m.outcomes.slice(0, 2).map((o, i) => (
                <OutcomeButton
                  key={o.tokenId || o.name}
                  tone={toneForIndex(i)}
                  selected={selected && selection.outcomeIndex === i}
                  disabled={!m.tradable}
                  onClick={() => onSelect({ marketId: m.id, outcomeIndex: i })}
                  title={o.name}
                >
                  <span className="truncate">{o.name}</span> {formatCents(o.price)}
                </OutcomeButton>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
