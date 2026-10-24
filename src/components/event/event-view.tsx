"use client";

import { useMemo, useState } from "react";
import type { ChartSeries } from "./price-chart";
import { MarketList, type Selection } from "./market-list";
import { MarketDetail } from "./market-detail";
import { MoneylineSelector } from "./moneyline-selector";
import { GameTabs } from "./game-tabs";
import { TradePanel } from "@/components/trading/trade-panel";
import { MarketImage } from "@/components/markets/market-image";
import { OutcomeButton, toneForIndex } from "@/components/ui/outcome-button";
import { useLiveBooks } from "@/hooks/use-live-books";
import { formatCents, formatCompactUsd, formatEndDate, formatPercent } from "@/lib/format";
import { buildMoneylineOptions } from "@/lib/polymarket/moneyline";
import { hasSportsMarkets, type GameTab } from "@/lib/polymarket/event-family";
import type { Market, PolyEvent } from "@/lib/polymarket/types";

const MAX_CHART_SERIES = 4;

export function EventView({
  event,
  initial,
  tabs,
}: {
  event: PolyEvent;
  initial: Selection;
  tabs: readonly GameTab[];
}) {
  const [selection, setSelection] = useState<Selection>(initial);
  const market = event.markets.find((m) => m.id === selection.marketId) ?? event.markets[0];
  const outcome = market?.outcomes[selection.outcomeIndex] ?? market?.outcomes[0];

  const tokenIds = useMemo(() => market?.outcomes.map((o) => o.tokenId) ?? [], [market]);
  const { books, status } = useLiveBooks(tokenIds);

  const moneyline = useMemo(() => buildMoneylineOptions(event), [event]);
  const moneylineIds = useMemo(() => new Set(moneyline.map((o) => o.marketId)), [moneyline]);
  const isMoneyline = market ? moneylineIds.has(market.id) : false;
  const otherMarkets = useMemo(() => event.markets.filter((m) => !moneylineIds.has(m.id)), [event, moneylineIds]);

  const series = useMemo<ChartSeries[]>(() => {
    const pool = moneyline.length > 0 ? event.markets.filter((m) => moneylineIds.has(m.id)) : event.markets;
    return pool
      .filter((m) => !m.closed && m.outcomes[0]?.tokenId)
      .slice(0, MAX_CHART_SERIES)
      .map((m) => ({
        key: m.id,
        label: event.isBinary ? (m.outcomes[0]?.name ?? "Yes") : m.label,
        tokenId: m.outcomes[0]!.tokenId,
      }));
  }, [event, moneyline, moneylineIds]);

  if (!market) return <p className="py-16 text-center text-body-sm text-base-content/60">This event has no markets.</p>;

  const select = (marketId: string, outcomeIndex = 0) => setSelection({ marketId, outcomeIndex });
  const header = isMoneyline ? (
    <MoneylineHeader
      volume={event.markets.filter((m) => moneylineIds.has(m.id)).reduce((sum, m) => sum + m.volume, 0)}
      selector={<MoneylineSelector options={moneyline} selectedMarketId={market.id} onSelect={(id) => select(id)} />}
    />
  ) : (
    <MarketHeader market={market} binary={event.isBinary} selection={selection} onSelect={select} />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-3">
        <header className="flex items-center gap-3">
          <MarketImage src={event.image} alt="" size={40} className="rounded-field" />
          <div className="min-w-0">
            <h1 className="truncate text-heading">{event.title}</h1>
            <p className="text-caption text-base-content/60 tabular-nums">
              {formatCompactUsd(event.volume)} Vol. · {formatCompactUsd(event.liquidity)} Liquidity
              {event.endDate && ` · Ends ${formatEndDate(event.endDate)}`}
            </p>
          </div>
        </header>

        <GameTabs tabs={tabs} currentSlug={event.slug} />

        <MarketDetail
          key={market.id}
          header={header}
          defaultTab={hasSportsMarkets(event) ? "book" : "graph"}
          tradeLabel={isMoneyline ? (moneyline.find((o) => o.marketId === market.id)?.label ?? "") : (outcome?.name ?? "")}
          book={outcome ? books[outcome.tokenId] : undefined}
          status={status}
          series={series}
          description={event.description}
        />

        {!event.isBinary && otherMarkets.length > 0 && (
          <MarketList markets={otherMarkets} selection={selection} onSelect={setSelection} />
        )}
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--spacing-header)+1rem)] lg:self-start">
        <TradePanel
          key={outcome?.tokenId ?? market.id}
          eventTitle={event.title}
          eventImage={event.icon}
          market={market}
          outcomeIndex={selection.outcomeIndex}
          onOutcomeChange={(outcomeIndex) => select(market.id, outcomeIndex)}
          book={outcome ? books[outcome.tokenId] : undefined}
          bookLive={status === "live"}
        />
      </aside>
    </div>
  );
}

function MoneylineHeader({ volume, selector }: { volume: number; selector: React.ReactNode }) {
  return (
    <>
      <div>
        <p className="text-body font-semibold">Moneyline</p>
        <p className="text-caption text-base-content/60 tabular-nums">{formatCompactUsd(volume)} Vol.</p>
      </div>
      {selector}
    </>
  );
}

function MarketHeader({
  market,
  binary,
  selection,
  onSelect,
}: {
  market: Market;
  binary: boolean;
  selection: Selection;
  onSelect: (marketId: string, outcomeIndex: number) => void;
}) {
  return (
    <>
      <div className="min-w-0">
        {binary ? (
          <p className="text-title text-accent">
            {formatPercent(market.outcomes[0]?.price)} <span className="text-body font-normal text-base-content/60">chance</span>
          </p>
        ) : (
          <p className="truncate text-heading">{market.label}</p>
        )}
        <p className="text-caption text-base-content/60 tabular-nums">{formatCompactUsd(market.volume)} Vol.</p>
      </div>
      <div className="flex gap-2">
        {market.outcomes.slice(0, 2).map((o, i) => (
          <OutcomeButton
            key={o.tokenId || o.name}
            tone={toneForIndex(i)}
            selected={selection.marketId === market.id && selection.outcomeIndex === i}
            onClick={() => onSelect(market.id, i)}
            title={o.name}
          >
            <span className="truncate">{o.name}</span> {formatCents(o.price)}
          </OutcomeButton>
        ))}
      </div>
    </>
  );
}
