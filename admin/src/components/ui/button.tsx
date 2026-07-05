import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-semibold transition-all duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer -webkit-tap-highlight-color-transparent active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-xs)] hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-muted/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted/60",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:opacity-90",
      },
      size: {
        default: "min-h-[var(--touch-min)] px-4 py-2 md:min-h-9 md:h-9",
        sm: "min-h-9 px-3 text-xs md:min-h-8 md:h-8",
        lg: "min-h-[var(--touch-min)] px-6 md:min-h-10 md:h-10",
        icon: "min-w-[var(--touch-icon)] min-h-[var(--touch-icon)] md:min-w-9 md:min-h-9 md:h-9 md:w-9",
        touch: "min-h-[var(--touch-min)] min-w-[var(--touch-min)]",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
