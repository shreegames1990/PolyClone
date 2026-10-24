import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MarketImage } from "./market-image";
import { formatCompactUsd, formatEndDate, formatPercent } from "@/lib/format";
import type { Market, PolyEvent } from "@/lib/polymarket/types";

const MAX_ROWS = 3;

export function EventCard({ event }: { event: PolyEvent }) {
  const openMarkets = event.markets.filter((m) => !m.closed);
  const href = `/event/${event.slug}`;

  return (
    <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-accent/40">
      <Link href={href} className="flex items-start gap-3">
        <MarketImage src={event.icon} alt="" size={44} />
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">{event.title}</h3>
        {event.isBinary && event.markets[0] && <ChanceBadge market={event.markets[0]} />}
      </Link>

      <div className="flex-1">
        {event.isBinary && event.markets[0] ? (
          <BinaryButtons href={href} />
        ) : (
          <ul className="space-y-1.5">
            {openMarkets.slice(0, MAX_ROWS).map((m) => (
              <MarketRow key={m.id} market={m} href={href} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCompactUsd(event.volume)} Vol.</span>
        {event.endDate && <span>Ends {formatEndDate(event.endDate)}</span>}
      </div>
    </Card>
  );
}

function ChanceBadge({ market }: { market: Market }) {
  const chance = market.outcomes[0]?.price ?? 0;
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-lg font-semibold">{formatPercent(chance)}</span>
      <span className="text-[10px] text-muted-foreground">chance</span>
    </div>
  );
}

function BinaryButtons({ href }: { href: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link
        href={`${href}?side=yes`}
        className="rounded-md bg-yes/15 py-2 text-center text-sm font-medium text-yes hover:bg-yes/25"
      >
        Buy Yes
      </Link>
      <Link
        href={`${href}?side=no`}
        className="rounded-md bg-no/15 py-2 text-center text-sm font-medium text-no hover:bg-no/25"
      >
        Buy No
      </Link>
    </div>
  );
}

function MarketRow({ market, href }: { market: Market; href: string }) {
  return (
    <li>
      <Link href={`${href}?market=${market.id}`} className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-muted-foreground">{market.label}</span>
        <span className="font-medium">{formatPercent(market.outcomes[0]?.price)}</span>
      </Link>
    </li>
  );
}
