import { Info, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Label on the left, control on the right (Limit price, Shares, Amount). */
export function FieldRow({ label, hint, children }: { label: string; hint?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-body font-semibold">{label}</p>
        {hint && <p className="text-caption text-base-content/60">{hint}</p>}
      </div>
      <div className="w-[11.5rem] shrink-0">{children}</div>
    </div>
  );
}

/** − value¢ + stepper for the limit price, in one bordered box. */
export function PriceStepper({
  value,
  onChange,
  onStep,
}: {
  value: string;
  onChange: (value: string) => void;
  onStep: (direction: 1 | -1) => void;
}) {
  return (
    <div className="flex h-12 items-center rounded-field border border-base-300">
      <button type="button" aria-label="Lower price" className="btn btn-ghost btn-square btn-sm ml-1" onClick={() => onStep(-1)}>
        <Minus className="size-4" />
      </button>
      <label className="flex min-w-0 flex-1 items-center justify-center text-heading">
        <input
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Limit price in cents"
          // Sized to its content so "61¢" sits centred between − and +.
          style={{ width: `${Math.max(1, value.length) + 0.25}ch` }}
          className="min-w-0 bg-transparent text-right font-semibold tabular-nums outline-none"
        />
        <span className="font-semibold">¢</span>
      </label>
      <button type="button" aria-label="Raise price" className="btn btn-ghost btn-square btn-sm mr-1" onClick={() => onStep(1)}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Large right-aligned number input with an optional $ prefix. */
export function AmountInput({
  value,
  onChange,
  prefix,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  label: string;
}) {
  return (
    <label className="input h-12 w-full border-base-300 bg-transparent text-heading">
      {prefix && <span className="text-base-content/60">{prefix}</span>}
      <input
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full text-right tabular-nums"
      />
    </label>
  );
}

const CHIP = "btn btn-neutral btn-sm h-8 min-w-12 px-3 text-label font-semibold shadow-none";

/** Quick adjustment chips (+$20, −10, Max…). */
export function QuickChips({
  deltas,
  format,
  onAdd,
  onMax,
}: {
  deltas: readonly number[];
  format: (delta: number) => string;
  onAdd: (delta: number) => void;
  onMax?: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {deltas.map((d) => (
        <button key={d} type="button" className={CHIP} onClick={() => onAdd(d)}>
          {format(d)}
        </button>
      ))}
      {onMax && (
        <button type="button" className={CHIP} onClick={onMax}>
          Max
        </button>
      )}
    </div>
  );
}

/** Total / To win lines in the panel footer. */
export function SummaryLine({ label, value, tone }: { label: string; value: string; tone: "info" | "yes" }) {
  const toWin = tone === "yes";
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-body font-semibold">
        {label}
        {toWin && (
          <span className="tooltip tooltip-right font-normal" data-tip="Payout if this outcome wins: $1 per share">
            <Info className="size-4 text-base-content/60" aria-label="About payout" />
          </span>
        )}
      </span>
      <span className={cn("flex items-center gap-2 text-title tabular-nums", toWin ? "text-yes" : "text-info")}>
        {toWin && (
          <span aria-hidden className="text-heading">
            💵
          </span>
        )}
        {value}
      </span>
    </div>
  );
}
