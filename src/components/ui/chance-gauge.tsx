import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const RADIUS = 26;
const STROKE = 4;
const ARC_LENGTH = Math.PI * RADIUS;

/** Half-circle gauge showing a binary market's chance, as on Polymarket cards. */
export function ChanceGauge({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(1, Math.max(0, value));
  const tone = clamped >= 0.5 ? "text-yes" : "text-no";
  const width = (RADIUS + STROKE) * 2;
  const height = RADIUS + STROKE * 1.5;
  const path = `M ${STROKE} ${RADIUS + STROKE} A ${RADIUS} ${RADIUS} 0 0 1 ${width - STROKE} ${RADIUS + STROKE}`;

  return (
    <div className={cn("relative flex shrink-0 flex-col items-center", className)} role="img" aria-label={`${formatPercent(clamped)} chance`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <path d={path} fill="none" stroke="var(--color-base-300)" strokeWidth={STROKE} strokeLinecap="round" />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH * clamped} ${ARC_LENGTH}`}
          className={tone}
        />
      </svg>
      <span className="-mt-5 text-label font-semibold tabular-nums">{formatPercent(clamped)}</span>
      <span className="text-[0.625rem] leading-none text-base-content/60">chance</span>
    </div>
  );
}
