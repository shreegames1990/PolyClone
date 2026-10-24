import { cn } from "@/lib/utils"

/** daisyUI `skeleton` placeholder. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("skeleton rounded-field bg-base-200", className)} {...props} />
}

export { Skeleton }
