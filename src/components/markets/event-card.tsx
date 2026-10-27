import Link from "next/link";
import { LiveScore } from "./live-score";
import { MarketImage } from "./market-image";
import { ChanceGauge } from "@/components/ui/chance-gauge";
import { outcomeButtonVariants } from "@/components/ui/outcome-button";
import { formatCents, formatCompactUsd, formatEndDate } from "@/lib/format";
import { cardTeams } from "@/lib/polymarket/teams";
import { cardOutcomes, type CardOutcome } from "@/lib/polymarket/card-outcomes";
import type { Market, PolyEvent, Team } from "@/lib/polymarket/types";
import { cn } from "@/lib/utils";

export function EventCard({ event }: { event: PolyEvent }) {
  const binary = event.isBinary ? event.markets[0] : undefined;
  const href = `/event/${event.slug}`;
  const teams = cardTeams(event);

  return (
    <article className="card min-w-0 gap-3 border border-border bg-base-200 p-4 transition-colors hover:bg-base-300/70">
      <Link href={href} className="flex items-start gap-3">
        {teams.length > 0 ? <TeamLogos teams={teams} /> : <MarketImage src={event.icon} alt="" size={40} />}
        <h3 className="line-clamp-2 flex-1 text-body-sm font-semibold">{event.title}</h3>
        {binary && <ChanceGauge value={binary.outcomes[0]?.price ?? 0} />}
      </Link>

      <LiveScore event={event} />

      <div>
        {binary ? (
          <BinaryButtons href={href} market={binary} />
        ) : (
          <Outcomes href={href} event={event} />
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

/** Side-by-side buttons (games, up to three markets) or a scrollable stacked list (more markets). */
function Outcomes({ href, event }: { href: string; event: PolyEvent }) {
  const { layout, items } = cardOutcomes(event);
  const linkFor = (o: CardOutcome) => `${href}?market=${o.marketId}&side=${o.side}`;

  if (layout === "list") {
    return (
      <ul aria-label="Markets" className="-mr-2 max-h-[7.5rem] space-y-1 overflow-y-auto pr-2">
        {items.map((o) => (
          <li key={o.marketId}>
            <Link href={linkFor(o)} className="flex items-center gap-2 rounded-field px-1 py-1 text-body-sm hover:bg-base-300/60">
              <span className="min-w-0 flex-1 truncate text-base-content/70">{o.label}</span>
              <span className="font-semibold tabular-nums">{formatCents(o.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}>
      {items.map((o) => (
        <Link
          key={`${o.marketId}-${o.side}`}
          href={linkFor(o)}
          title={`${o.label}: ${formatCents(o.price)}`}
          style={o.color ? { backgroundColor: `color-mix(in oklab, ${o.color} 40%, transparent)` } : undefined}
          className={cn(
            "flex h-10 min-w-0 flex-row items-center justify-center gap-1.5 rounded-field px-2 transition-colors",
            o.color ? "text-base-content hover:brightness-110" : "bg-base-300/60 hover:bg-base-300",
          )}
        >
          <span className="min-w-0 truncate text-caption font-semibold uppercase text-base-content/70">{o.label}</span>
          <span className="shrink-0 text-body-sm font-semibold tabular-nums">{formatCents(o.price)}</span>
        </Link>
      ))}
    </div>
  );
}

/** Two team logos, overlapped diagonally in the 40px icon slot (game cards). */
function TeamLogos({ teams }: { teams: readonly Team[] }) {
  const [first, second] = teams;
  return (
    <span role="group" aria-label={teams.map((t) => t.name).join(" vs ")} className="relative size-10 shrink-0">
      {first && <MarketImage src={first.logo} alt={first.name} size={28} className="absolute top-0 left-0 rounded-full bg-base-100 object-contain" />}
      {second && (
        <MarketImage
          src={second.logo}
          alt={second.name}
          size={28}
          className="absolute right-0 bottom-0 rounded-full bg-base-100 object-contain ring-2 ring-base-200"
        />
      )}
    </span>
  );
}
