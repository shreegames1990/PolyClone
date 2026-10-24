import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Label on the left, control on the right (Limit price, Shares, Amount). */
export function FieldRow({ label, hint, children }: { label: string; hint?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-body font-semibold">{label}</p>
        {hint && <p className="text-caption text-base-content/60">{hint}</p>}
      </div>
      <div className="w-44 shrink-0">{children}</div>
    </div>
  );
}

/** − value¢ + stepper for the limit price. */
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
    <div className="join w-full">
      <button type="button" aria-label="Lower price" className="btn join-item btn-square bg-base-200" onClick={() => onStep(-1)}>
        <Minus className="size-4" />
      </button>
      <label className="input join-item bg-base-200 px-1 text-center text-heading">
        <input
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Limit price in cents"
          className="w-full text-center tabular-nums"
        />
        <span className="text-base-content/60">¢</span>
      </label>
      <button type="button" aria-label="Raise price" className="btn join-item btn-square bg-base-200" onClick={() => onStep(1)}>
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
    <label className="input h-14 w-full bg-base-200 text-heading">
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

/** Total / To win lines under the form. */
export function SummaryLine({ label, value, tone }: { label: string; value: string; tone: "info" | "yes" }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-body font-semibold">{label}</span>
      <span className={cn("text-title tabular-nums", tone === "info" ? "text-info" : "text-yes")}>{value}</span>
    </div>
  );
}
