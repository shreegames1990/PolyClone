import type { MoneylineOption } from "@/lib/polymarket/moneyline";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

/** MAD / DRAW / DEP buttons; the selected one takes the team color (indigo for the draw). */
export function MoneylineSelector({
  options,
  selectedMarketId,
  onSelect,
}: {
  options: readonly MoneylineOption[];
  selectedMarketId: string;
  onSelect: (marketId: string) => void;
}) {
  return (
    <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-md" role="radiogroup" aria-label="Moneyline outcome">
      {options.map((o) => {
        const selected = o.marketId === selectedMarketId;
        return (
          <button
            key={o.marketId}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(o.marketId)}
            style={selected && o.color ? { backgroundColor: o.color } : undefined}
            className={cn(
              "btn h-10 min-h-10 gap-1 border-none px-2 text-label font-semibold uppercase tabular-nums sm:text-body-sm",
              selected ? "bg-secondary text-secondary-content" : "bg-base-300/60 text-base-content/60 hover:bg-base-300",
            )}
          >
            <span className="truncate">{o.label}</span> {formatCents(o.price)}
          </button>
        );
      })}
    </div>
  );
}
