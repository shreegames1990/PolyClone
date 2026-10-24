"use client";

import { bookSummary, type OrderBook as Book } from "@/lib/polymarket/orderbook";
import type { SocketStatus } from "@/hooks/use-live-books";
import type { BookLevel } from "@/lib/trading/order-math";
import { formatCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEPTH = 8;

export function OrderBook({ book, status }: { book: Book | undefined; status: SocketStatus }) {
  const { spread, mid } = bookSummary(book);
  const asks = (book?.asks ?? []).slice(0, DEPTH).toReversed();
  const bids = (book?.bids ?? []).slice(0, DEPTH);
  const maxSize = Math.max(1, ...asks.map((l) => l.size), ...bids.map((l) => l.size));

  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Order book</h3>
        <StatusDot status={status} />
      </div>
      <div className="grid grid-cols-3 px-2 pb-1 text-xs text-muted-foreground">
        <span>Price</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total</span>
      </div>
      {!book ? (
        <p className="py-6 text-center text-muted-foreground">Loading order book…</p>
      ) : (
        <>
          {asks.map((l) => (
            <Row key={`a${l.price}`} level={l} side="ask" maxSize={maxSize} />
          ))}
          <div className="my-1 flex justify-between border-y px-2 py-1 text-xs text-muted-foreground">
            <span>Last: {book.lastTradePrice !== null ? formatCents(book.lastTradePrice) : "—"}</span>
            <span>Mid: {mid !== null ? formatCents(mid) : "—"}</span>
            <span>Spread: {spread !== null ? formatCents(spread) : "—"}</span>
          </div>
          {bids.map((l) => (
            <Row key={`b${l.price}`} level={l} side="bid" maxSize={maxSize} />
          ))}
        </>
      )}
    </div>
  );
}

function Row({ level, side, maxSize }: { level: BookLevel; side: "bid" | "ask"; maxSize: number }) {
  return (
    <div className="relative grid grid-cols-3 px-2 py-0.5 tabular-nums">
      <div
        className={cn("absolute inset-y-0 right-0", side === "bid" ? "bg-yes/10" : "bg-no/10")}
        style={{ width: `${(level.size / maxSize) * 100}%` }}
      />
      <span className={cn("relative", side === "bid" ? "text-yes" : "text-no")}>{formatCents(level.price)}</span>
      <span className="relative text-right">{level.size.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
      <span className="relative text-right">{formatUsd(level.size * level.price)}</span>
    </div>
  );
}

function StatusDot({ status }: { status: SocketStatus }) {
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-2 rounded-full",
          status === "live" ? "bg-yes" : status === "connecting" ? "bg-yellow-500" : "bg-no",
        )}
      />
      {label}
    </span>
  );
}
