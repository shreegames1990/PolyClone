import type { GameTab } from "@/lib/polymarket/event-family";
import { PillLink } from "@/components/ui/pill";

/** Links between a game's main event (moneyline) and its child events. */
export function GameTabs({ tabs, currentSlug }: { tabs: readonly GameTab[]; currentSlug: string }) {
  if (tabs.length === 0) return null;
  return (
    <nav aria-label="Game markets" className="-mx-4 flex gap-2 overflow-x-auto px-4">
      {tabs.map((tab) => (
        <PillLink key={tab.slug} size="xs" href={`/event/${tab.slug}`} active={tab.slug === currentSlug}>
          {tab.label}
        </PillLink>
      ))}
    </nav>
  );
}
