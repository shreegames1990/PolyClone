import Link from "next/link";
import { MarketImage } from "./market-image";
import { ChanceGauge } from "@/components/ui/chance-gauge";
import { outcomeButtonVariants, toneForIndex } from "@/components/ui/outcome-button";
import { formatCompactUsd, formatEndDate, formatPercent } from "@/lib/format";
import type { Market, PolyEvent } from "@/lib/polymarket/types";
import { cn } from "@/lib/utils";

const MAX_ROWS = 3;

export function EventCard({ event }: { event: PolyEvent }) {
  const binary = event.isBinary ? event.markets[0] : undefined;
  const openMarkets = event.markets.filter((m) => !m.closed);
  const href = `/event/${event.slug}`;

  return (
    <article className="card min-h-48 min-w-0 gap-3 border border-border bg-base-200 p-4 transition-colors hover:bg-base-300/70">
      <Link href={href} className="flex items-start gap-3">
        <MarketImage src={event.icon} alt="" size={40} />
        <h3 className="line-clamp-2 flex-1 text-body-sm font-semibold">{event.title}</h3>
        {binary && <ChanceGauge value={binary.outcomes[0]?.price ?? 0} />}
      </Link>

      <div className="flex flex-1 flex-col justify-end">
        {binary ? (
          <BinaryButtons href={href} market={binary} />
        ) : (
          <ul className="space-y-2">
            {openMarkets.slice(0, MAX_ROWS).map((m) => (
              <MarketRow key={m.id} market={m} href={href} />
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between text-caption text-base-content/60">
        <span className="tabular-nums">{formatCompactUsd(event.volume)} Vol.</span>
        {event.endDate && <span>Ends {formatEndDate(event.endDate)}</span>}
      </footer>
    </article>
  );
}

function BinaryButtons({ href, market }: { href: string; market: Market }) {
  const [yes, no] = market.outcomes;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href={`${href}?side=yes`} className={cn(outcomeButtonVariants({ tone: "yes", size: "md" }), "w-full")}>
        Buy {yes?.name ?? "Yes"}
      </Link>
      <Link href={`${href}?side=no`} className={cn(outcomeButtonVariants({ tone: "no", size: "md" }), "w-full")}>
        Buy {no?.name ?? "No"}
      </Link>
    </div>
  );
}

function MarketRow({ market, href }: { market: Market; href: string }) {
  const marketHref = `${href}?market=${market.id}`;
  return (
    <li className="flex items-center gap-2">
      <Link href={marketHref} className="min-w-0 flex-1 truncate text-body-sm text-base-content/60 hover:text-base-content">
        {market.label}
      </Link>
      <span className="w-10 text-right text-body-sm font-semibold tabular-nums">{formatPercent(market.outcomes[0]?.price)}</span>
      <div className="flex gap-1">
        {market.outcomes.slice(0, 2).map((o, i) => (
          <Link
            key={o.tokenId || o.name}
            href={`${marketHref}&side=${i === 0 ? "yes" : "no"}`}
            title={o.name}
            className={cn(outcomeButtonVariants({ tone: toneForIndex(i), size: "sm" }), "w-14")}
          >
            <span className="truncate">{o.name}</span>
          </Link>
        ))}
      </div>
    </li>
  );
}
