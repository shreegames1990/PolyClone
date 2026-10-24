"use client";

import { useState } from "react";
import { PriceChart, type ChartSeries } from "./price-chart";
import { OrderBook } from "./order-book";
import { Card } from "@/components/ui/card";
import type { OrderBook as Book } from "@/lib/polymarket/orderbook";
import type { SocketStatus } from "@/hooks/use-live-books";
import { cn } from "@/lib/utils";

export type DetailTab = "book" | "graph" | "about";

const TABS: readonly { key: DetailTab; label: string }[] = [
  { key: "book", label: "Order Book" },
  { key: "graph", label: "Graph" },
  { key: "about", label: "About" },
];

/** Selected-market card: a header (title, outcome selector) above Order Book / Graph / About tabs. */
export function MarketDetail({
  header,
  defaultTab,
  tradeLabel,
  book,
  status,
  series,
  description,
}: {
  header: React.ReactNode;
  defaultTab: DetailTab;
  tradeLabel: string;
  book: Book | undefined;
  status: SocketStatus;
  series: readonly ChartSeries[];
  description: string;
}) {
  const [tab, setTab] = useState<DetailTab>(defaultTab);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3">{header}</div>
      <div role="tablist" className="tabs tabs-border tabs-sm border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn("tab text-body-sm font-semibold", tab === t.key ? "tab-active" : "text-base-content/60")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={cn(tab !== "book" && "p-4")}>
        {tab === "book" && <OrderBook book={book} status={status} tradeLabel={tradeLabel} />}
        {tab === "graph" && <PriceChart series={series} />}
        {tab === "about" && (
          <p className="whitespace-pre-line text-body-sm text-base-content/70">
            {description || "No rules provided for this market."}
          </p>
        )}
      </div>
    </Card>
  );
}
