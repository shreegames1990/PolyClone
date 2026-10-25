"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTrading } from "@/components/trading/trading-provider";
import { usePositions } from "@/hooks/use-portfolio";
import { buildEventPositions, type EventPositionRow } from "@/lib/polymarket/event-positions";
import type { PolyEvent } from "@/lib/polymarket/types";
import { formatCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OutcomeBadge } from "./outcome-badge";

const COLUMNS = ["Type", "Outcome", "Avg", "Cost", "To win", "Current", ""] as const;

/** "All Positions": the connected wallet's holdings in this event (polymarket.com layout). */
export function PositionsCard({
  event,
  onSell,
}: {
  event: PolyEvent;
  onSell: (marketId: string, outcomeIndex: number) => void;
}) {
  const { tradingAddress } = useTrading();
  const { data } = usePositions(tradingAddress ?? undefined);
  const [open, setOpen] = useState(true);
  const rows = data ? buildEventPositions(event, data) : [];
  if (rows.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-base-300/40"
      >
        <span className="text-body font-semibold">All Positions</span>
        <ChevronUp className={cn("size-5 transition-transform", !open && "rotate-180")} />
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="table table-sm min-w-[40rem] tabular-nums">
            <thead>
              <tr className="border-border text-caption uppercase tracking-wide text-base-content/60">
                {COLUMNS.map((c) => (
                  <th key={c} className="font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PositionRow key={row.position.tokenId} row={row} onSell={onSell} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PositionRow({ row, onSell }: { row: EventPositionRow; onSell: (marketId: string, outcomeIndex: number) => void }) {
  const { position } = row;
  const up = position.pnl >= 0;
  return (
    <tr className="border-border text-body-sm">
      <td className="max-w-40 truncate font-medium">{row.type}</td>
      <td>
        <OutcomeBadge label={row.outcome} color={row.color} outcomeIndex={row.outcomeIndex} count={row.position.size} />
      </td>
      <td>{formatCents(position.avgPrice)}</td>
      <td>{formatUsd(position.cost)}</td>
      <td>{formatUsd(row.toWin)}</td>
      <td className={cn("whitespace-nowrap", up ? "text-yes" : "text-no")}>
        {formatUsd(position.value)} ({up ? "+" : "-"}
        {formatUsd(Math.abs(position.pnl))})
      </td>
      <td className="text-right">
        <button type="button" className="btn btn-sm btn-outline border-border" onClick={() => onSell(row.marketId, row.outcomeIndex)}>
          Sell
        </button>
      </td>
    </tr>
  );
}
