"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border-2 border-ink bg-clip-padding font-display uppercase tracking-[0.08em] whitespace-nowrap transition-transform outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-cream shadow-brut-accent hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--brand-orange)]",
        outline:
          "bg-transparent text-ink shadow-brut-sm hover:bg-cream-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--shadow-color)]",
        secondary:
          "bg-cream-2 text-ink shadow-brut-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--shadow-color)]",
        ghost:
          "bg-transparent text-ink border-transparent hover:bg-cream-2 hover:border-ink",
        destructive:
          "bg-destructive text-ink shadow-brut-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--shadow-color)]",
        link:
          "text-ink underline-offset-4 hover:underline border-0 shadow-none",
      },
      size: {
        default:
          "h-10 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2 text-[10px] tracking-[0.06em] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

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
