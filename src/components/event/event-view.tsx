"use client";

import { useMemo, useState } from "react";
import { PriceChart, type ChartSeries } from "./price-chart";
import { OrderBook } from "./order-book";
import { MarketList, type Selection } from "./market-list";
import { TradePanel } from "@/components/trading/trade-panel";
import { MarketImage } from "@/components/markets/market-image";
import { useLiveBooks } from "@/hooks/use-live-books";
import { formatCompactUsd, formatEndDate, formatPercent } from "@/lib/format";
import type { PolyEvent } from "@/lib/polymarket/types";

const MAX_CHART_SERIES = 4;

export function EventView({ event, initial }: { event: PolyEvent; initial: Selection }) {
  const [selection, setSelection] = useState<Selection>(initial);
  const market = event.markets.find((m) => m.id === selection.marketId) ?? event.markets[0];
  const outcome = market?.outcomes[selection.outcomeIndex] ?? market?.outcomes[0];

  const tokenIds = useMemo(() => market?.outcomes.map((o) => o.tokenId) ?? [], [market]);
  const { books, status } = useLiveBooks(tokenIds);

  const series = useMemo<ChartSeries[]>(() => {
    const open = event.markets.filter((m) => !m.closed && m.outcomes[0]?.tokenId);
    return open.slice(0, MAX_CHART_SERIES).map((m) => ({
      key: m.id,
      label: event.isBinary ? (m.outcomes[0]?.name ?? "Yes") : m.label,
      tokenId: m.outcomes[0]!.tokenId,
    }));
  }, [event]);

  if (!market) return <p className="text-muted-foreground">This event has no markets.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <header className="flex items-start gap-4">
          <MarketImage src={event.image} alt="" size={64} className="rounded-lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-tight">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              {formatCompactUsd(event.volume)} Vol. · {formatCompactUsd(event.liquidity)} Liquidity
              {event.endDate && ` · Ends ${formatEndDate(event.endDate)}`}
            </p>
          </div>
        </header>

        {event.isBinary && (
          <p className="text-3xl font-semibold">
            {formatPercent(market.outcomes[0]?.price)} <span className="text-base font-normal text-muted-foreground">chance</span>
          </p>
        )}

        <PriceChart series={series} />

        {!event.isBinary && <MarketList markets={event.markets} selection={selection} onSelect={setSelection} />}

        {outcome && (
          <section className="rounded-xl border p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Trade {outcome.name}
              {!event.isBinary && ` · ${market.label}`}
            </p>
            <OrderBook book={books[outcome.tokenId]} status={status} />
          </section>
        )}

        {event.description && (
          <section className="space-y-2">
            <h2 className="font-semibold">Rules</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{event.description}</p>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <TradePanel
          key={outcome?.tokenId ?? market.id}
          market={market}
          outcomeIndex={selection.outcomeIndex}
          onOutcomeChange={(outcomeIndex) => setSelection({ marketId: market.id, outcomeIndex })}
          book={outcome ? books[outcome.tokenId] : undefined}
          bookLive={status === "live"}
        />
      </aside>
    </div>
  );
}
