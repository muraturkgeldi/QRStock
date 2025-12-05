import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium " +
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:ring-primary-soft focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          [
            // light
            "bg-white text-emerald-700 border border-emerald-500",
            "hover:bg-emerald-500 hover:text-white",
            // dark
            "dark:bg-slate-900 dark:text-emerald-300 dark:border-emerald-500",
            "dark:hover:bg-emerald-500 dark:hover:text-slate-950",
          ].join(" "),
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
           [
            "border border-emerald-500/50 bg-transparent text-emerald-700",
            "hover:bg-emerald-500 hover:text-white",
            "dark:text-emerald-300 dark:border-emerald-400/60",
            "dark:hover:bg-emerald-500 dark:hover:text-slate-950",
          ].join(" "),
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "bg-transparent hover:bg-primary-soft/10 text-foreground dark:hover:bg-primary-soft/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
