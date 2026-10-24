import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/** daisyUI `btn` with the theme's variants. "trade" is the indigo order button. */
const buttonVariants = cva("btn font-semibold", {
  variants: {
    variant: {
      default: "btn-primary",
      trade: "btn-secondary",
      neutral: "btn-neutral",
      outline: "btn-outline",
      ghost: "btn-ghost",
      destructive: "btn-error btn-soft",
      link: "btn-link",
    },
    size: {
      xs: "btn-xs",
      sm: "btn-sm",
      default: "",
      lg: "btn-lg text-body",
      icon: "btn-square btn-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
