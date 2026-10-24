import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

/** daisyUI `input` on the base-200 field color. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn("input w-full bg-base-200 tabular-nums", className)}
      {...props}
    />
  )
}

export { Input }
