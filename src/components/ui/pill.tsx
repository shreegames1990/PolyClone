import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Rounded daisyUI `btn` chip for sort options, game tabs, chart ranges and quick amounts. */
export const pillVariants = cva("btn rounded-full border-none font-medium shadow-none", {
  variants: {
    active: {
      true: "bg-base-content text-base-100 hover:bg-base-content",
      false: "bg-base-200 text-base-content/70 hover:bg-base-300 hover:text-base-content",
    },
    size: {
      xs: "btn-xs h-7 px-2.5 text-caption",
      sm: "btn-sm h-8 px-3 text-label",
    },
  },
  defaultVariants: { active: false, size: "sm" },
});

type PillProps = VariantProps<typeof pillVariants>;

export function PillLink({ active, size, className, ...props }: React.ComponentProps<typeof Link> & PillProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(pillVariants({ active, size }), className)}
      {...props}
    />
  );
}

export function PillButton({ active, size, className, ...props }: React.ComponentProps<"button"> & PillProps) {
  return (
    <button
      type="button"
      aria-pressed={active ?? false}
      className={cn(pillVariants({ active, size }), className)}
      {...props}
    />
  );
}
