import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // shadcn-compat
        default:     "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:     "border border-border bg-bg-elevated text-fg shadow-sm hover:bg-bg-muted",
        secondary:   "bg-bg-muted text-fg shadow-sm hover:bg-bg-muted/80",
        ghost:       "text-fg hover:bg-bg-muted",
        link:        "text-brand underline-offset-4 hover:underline",
        // Filey-opinionated
        brand:        "bg-brand text-brand-fg shadow-sm hover:bg-brand-strong",
        'brand-soft': "bg-brand-soft text-brand hover:bg-brand-soft/80",
        gradient:     "bg-gradient-to-br from-brand to-brand-strong text-brand-fg shadow-md hover:shadow-lg hover:scale-[1.02]",
        success:      "bg-success text-success-fg shadow-sm hover:bg-success/90",
        'success-soft': "bg-success-soft text-success hover:bg-success-soft/70",
        warning:      "bg-warning text-warning-fg shadow-sm hover:bg-warning/90",
        info:         "bg-info text-info-fg shadow-sm hover:bg-info/90",
        danger:       "bg-danger text-danger-fg shadow-sm hover:bg-danger/90",
        'danger-soft':"bg-danger-soft text-danger hover:bg-danger-soft/70",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        md:      "h-9 rounded-md px-4 text-sm",
        lg:      "h-10 rounded-lg px-6 text-sm",
        xl:      "h-12 rounded-xl px-8 text-base",
        icon:    "h-9 w-9",
        'icon-sm':"h-7 w-7 [&_svg]:size-3.5",
        'icon-lg':"h-11 w-11 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
