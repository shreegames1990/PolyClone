import * as React from "react"
import { cn } from "@/lib/utils"

/** daisyUI `card` on base-200 with a hairline border, as on Polymarket. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("card border border-border bg-base-200 text-body-sm", className)}
      {...props}
    />
  )
}

function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-body" className={cn("card-body gap-4 p-5", className)} {...props} />
}

export { Card, CardBody }
