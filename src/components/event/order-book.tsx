"use client";

import { bookSummary, withCumulativeTotals, type CumulativeLevel, type OrderBook as Book } from "@/lib/polymarket/orderbook";
import type { SocketStatus } from "@/hooks/use-live-books";
import { formatCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Levels loaded per side; deeper levels are reached by scrolling. */
const DEPTH = 20;
/** Best levels visible per side before scrolling. */
const VISIBLE_LEVELS = 6;
/** Row height in rem; matches the h-7 rows below. */
const ROW_REM = 1.75;
const HALF_STYLE = { maxHeight: `${VISIBLE_LEVELS * ROW_REM}rem` };
const GRID =
  "grid grid-cols-[1fr_3.25rem_4.75rem_5.5rem] items-center gap-1.5 px-3 sm:grid-cols-[1fr_5rem_6rem_7rem] sm:gap-2 sm:px-4";

export function OrderBook({
  book,
  status,
  tradeLabel,
}: {
  book: Book | undefined;
  status: SocketStatus;
  tradeLabel: string;
}) {
  const { spread } = bookSummary(book);
  // Totals accumulate outward from the spread. Asks render best-first in a column-reverse list,
  // so the best ask sits next to the spread and the list starts scrolled to it.
  const asks = withCumulativeTotals((book?.asks ?? []).slice(0, DEPTH));
  const bids = withCumulativeTotals((book?.bids ?? []).slice(0, DEPTH));
  // Depth bars span the visible levels; deeper rows show a full bar.
  const visibleTotal = (levels: readonly CumulativeLevel[]) => levels[Math.min(levels.length, VISIBLE_LEVELS) - 1]?.total ?? 0;
  const maxTotal = Math.max(Number.EPSILON, visibleTotal(asks), visibleTotal(bids));

  return (
    <div data-slot="order-book" className="text-label tabular-nums">
      <div className={cn(GRID, "h-8 border-b border-border text-caption font-medium uppercase tracking-wide text-base-content/60")}>
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <span className="truncate">Trade {tradeLabel}</span> <StatusDot status={status} />
        </span>
        <span className="text-right">Price</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total</span>
      </div>
      {!book ? (
        <p className="py-10 text-center text-body-sm text-base-content/60">Loading order book…</p>
      ) : (
        <>
          <div className="flex flex-col-reverse overflow-y-auto" style={HALF_STYLE}>
            {asks.map((l, i) => (
              <Row key={`a${l.price}`} level={l} side="ask" maxTotal={maxTotal} badge={i === 0} />
            ))}
          </div>
          <div className={cn(GRID, "h-8 border-y border-border text-caption font-medium text-base-content/70")}>
            <span>Last: {book.lastTradePrice !== null ? formatCents(book.lastTradePrice) : "—"}</span>
            <span className="col-span-3">Spread: {spread !== null ? formatCents(spread) : "—"}</span>
          </div>
          <div className="overflow-y-auto" style={HALF_STYLE}>
            {bids.map((l, i) => (
              <Row key={`b${l.price}`} level={l} side="bid" maxTotal={maxTotal} badge={i === 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ level, side, maxTotal, badge }: { level: CumulativeLevel; side: "bid" | "ask"; maxTotal: number; badge: boolean }) {
  const isBid = side === "bid";
  return (
    <div className={cn(GRID, "relative h-7 shrink-0 hover:bg-base-300/40")}>
      <div
        aria-hidden
        className={cn("absolute inset-y-0 left-0", isBid ? "bg-yes/10" : "bg-no/10")}
        style={{ width: `${Math.min(1, level.total / maxTotal) * 50}%` }}
      />
      <span className="relative">
        {badge && <span className={cn("badge badge-xs border-none font-semibold", isBid ? "badge-success" : "badge-error")}>{isBid ? "Bids" : "Asks"}</span>}
      </span>
      <span className={cn("relative text-right font-medium", isBid ? "text-yes" : "text-no")}>{formatCents(level.price)}</span>
      <span className="relative text-right">{level.size.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
      <span className="relative text-right">{formatUsd(level.total)}</span>
    </div>
  );
}

function StatusDot({ status }: { status: SocketStatus }) {
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting";
  return (
    <span className="tooltip tooltip-right normal-case" data-tip={label}>
      <span
        aria-label={label}
        className={cn("status", status === "live" ? "status-success" : status === "connecting" ? "status-warning" : "status-error")}
      />
    </span>
  );
}
