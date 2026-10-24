"use client";

import { OutcomeButton, toneForIndex } from "@/components/ui/outcome-button";
import { formatCents } from "@/lib/format";
import type { Market } from "@/lib/polymarket/types";

export const TRADE_PANEL_ID = "trade-panel";

/**
 * Phones and tablets: a sticky bottom bar with the selected market's Buy buttons.
 * Picking one selects that outcome and scrolls to the trade panel.
 */
export function MobileTradeBar({ market, onPick }: { market: Market; onPick: (outcomeIndex: number) => void }) {
  const pick = (index: number) => {
    onPick(index);
    document.getElementById(TRADE_PANEL_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-base-100/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        {market.outcomes.slice(0, 2).map((o, i) => (
          <OutcomeButton
            key={o.tokenId || o.name}
            tone={toneForIndex(i)}
            size="lg"
            disabled={!market.tradable}
            onClick={() => pick(i)}
            title={o.name}
          >
            <span className="truncate">Buy {o.name}</span> {formatCents(o.price)}
          </OutcomeButton>
        ))}
      </div>
    </div>
  );
}
