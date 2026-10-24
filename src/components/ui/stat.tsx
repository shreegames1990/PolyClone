import { cn } from "@/lib/utils";

/** Labelled figure (volume, liquidity, portfolio value…). */
export function Stat({
  label,
  value,
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-caption text-base-content/60">{label}</p>
      <p className={cn("truncate tabular-nums", size === "md" ? "text-title" : "text-body-sm font-semibold")}>{value}</p>
    </div>
  );
}
