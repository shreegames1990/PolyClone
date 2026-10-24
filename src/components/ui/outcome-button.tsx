import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Yes/No outcome buttons on daisyUI `btn`.
 * - "soft": tinted green/red (cards, market rows).
 * - "solid": the trade panel — selected is solid success/error, idle is the field color.
 */
export const outcomeButtonVariants = cva("btn border-none font-semibold tabular-nums shadow-none", {
  variants: {
    tone: { yes: "", no: "" },
    look: { soft: "", solid: "" },
    size: {
      sm: "btn-xs h-7 px-2 text-caption",
      md: "btn-sm h-9 w-28 text-body-sm",
      lg: "h-12 w-full text-body",
    },
    selected: { true: "", false: "" },
  },
  compoundVariants: [
    { look: "soft", tone: "yes", className: "bg-yes/15 text-yes hover:bg-yes/25" },
    { look: "soft", tone: "no", className: "bg-no/15 text-no hover:bg-no/25" },
    { look: "soft", tone: "yes", selected: true, className: "bg-success text-success-content hover:bg-success" },
    { look: "soft", tone: "no", selected: true, className: "bg-error text-error-content hover:bg-error" },
    { look: "solid", selected: false, className: "bg-base-300/60 text-base-content/60 hover:bg-base-300" },
    { look: "solid", tone: "yes", selected: true, className: "btn-success shadow-[0_3px_0_#295f26]" },
    { look: "solid", tone: "no", selected: true, className: "btn-error shadow-[0_3px_0_#8f1a10]" },
  ],
  defaultVariants: { tone: "yes", look: "soft", size: "md", selected: false },
});

export type OutcomeTone = NonNullable<VariantProps<typeof outcomeButtonVariants>["tone"]>;

/** First outcome reads as "yes" (green), second as "no" (red). */
export const toneForIndex = (index: number): OutcomeTone => (index === 0 ? "yes" : "no");

export function OutcomeButton({
  tone,
  look,
  size,
  selected,
  className,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof outcomeButtonVariants>) {
  return (
    <button
      type="button"
      aria-pressed={selected ?? undefined}
      className={cn(outcomeButtonVariants({ tone, look, size, selected }), className)}
      {...props}
    />
  );
}
