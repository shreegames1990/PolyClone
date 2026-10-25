import { cn } from "@/lib/utils";

/** "BAR YES | 3,112": team color for moneyline outcomes, green / red otherwise. */
export function OutcomeBadge({
  label,
  color,
  outcomeIndex,
  count,
}: {
  label: string;
  color: string | null;
  outcomeIndex: number;
  count?: number;
}) {
  const toneClass = color ? "" : outcomeIndex === 0 ? "bg-yes/15 text-yes" : "bg-no/15 text-no";
  return (
    <span
      className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-field px-2 py-1 text-label font-semibold", toneClass)}
      style={color ? { color, backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)` } : undefined}
    >
      <span>{label}</span>
      {count !== undefined && (
        <>
          <span className="h-3.5 w-px bg-current opacity-40" aria-hidden />
          <span>{count.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        </>
      )}
    </span>
  );
}
