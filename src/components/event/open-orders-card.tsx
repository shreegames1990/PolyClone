"use client";

import { useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OutcomeBadge } from "./outcome-badge";
import { useCancelOrder, useCancelOrders, useOpenOrders } from "@/hooks/use-trading-data";
import { useTrading } from "@/components/trading/trading-provider";
import { buildEventOrders, type EventOrderRow } from "@/lib/polymarket/event-orders";
import type { PolyEvent } from "@/lib/polymarket/types";
import { formatCents, formatEndDate, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS = ["Type", "Side", "Outcome", "Price", "Filled", "Total", "Exp."] as const;
const shares = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** "Open Orders": the wallet's resting orders in this event (polymarket.com layout). */
export function OpenOrdersCard({ event }: { event: PolyEvent }) {
  const { status } = useTrading();
  const { data, isError, refetch } = useOpenOrders();
  const cancelOne = useCancelOrder();
  const cancelMany = useCancelOrders();
  const [open, setOpen] = useState(true);

  // Open orders need the signed trading client; say so instead of silently showing nothing.
  if (status === "locked") return <Notice>Enable trading to load your open orders.</Notice>;
  if (status === "ready" && isError) {
    return (
      <Notice>
        Could not load your open orders.
        <button type="button" className="btn btn-xs btn-neutral" onClick={() => void refetch()}>
          Retry
        </button>
      </Notice>
    );
  }
  const rows = data ? buildEventOrders(event, data) : [];
  if (rows.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-base-300/40"
      >
        <span className="text-body font-semibold">Open Orders</span>
        <ChevronUp className={cn("size-5 transition-transform", !open && "rotate-180")} />
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="table table-sm min-w-[44rem] tabular-nums">
            <thead>
              <tr className="border-border text-caption uppercase tracking-wide text-base-content/60">
                {COLUMNS.map((c) => (
                  <th key={c} className="font-medium">
                    {c}
                  </th>
                ))}
                <th className="text-right">
                  <button
                    type="button"
                    className="btn btn-sm btn-error btn-soft normal-case"
                    disabled={cancelMany.isPending}
                    onClick={() => cancelMany.mutate(rows.map((r) => r.id))}
                  >
                    Cancel all
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <OrderRow
                  key={row.id}
                  row={row}
                  cancelling={cancelOne.isPending && cancelOne.variables === row.id}
                  onCancel={() => cancelOne.mutate(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Card className="flex-row items-center justify-between gap-3 px-4 py-3">
      <span className="text-body font-semibold">Open Orders</span>
      <span className="flex items-center gap-2 text-body-sm text-base-content/60">{children}</span>
    </Card>
  );
}

function OrderRow({ row, cancelling, onCancel }: { row: EventOrderRow; cancelling: boolean; onCancel: () => void }) {
  return (
    <tr className="border-border text-body-sm">
      <td className="max-w-40 truncate font-medium">{row.type}</td>
      <td className={row.side === "Buy" ? "text-yes" : "text-no"}>{row.side}</td>
      <td>
        <OutcomeBadge label={row.outcome} color={row.color} outcomeIndex={row.outcomeIndex} />
      </td>
      <td>{formatCents(row.price)}</td>
      <td>
        {shares(row.filled)} / {shares(row.size)}
      </td>
      <td>{formatUsd(row.total)}</td>
      <td className="whitespace-nowrap">{row.expiresAt ? formatEndDate(row.expiresAt) : "Until cancelled"}</td>
      <td className="text-right">
        <button
          type="button"
          aria-label={`Cancel order ${row.outcome} at ${formatCents(row.price)}`}
          className="btn btn-ghost btn-sm btn-square"
          disabled={cancelling}
          onClick={onCancel}
        >
          <X className="size-4" />
        </button>
      </td>
    </tr>
  );
}
