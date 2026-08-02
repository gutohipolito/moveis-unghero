import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-semibold transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [-webkit-tap-highlight-color:transparent]",
  {
    variants: {
      variant: {
        default:
          "btn-metallic",
        destructive:
          "btn-destructive-relief",
        outline:
          "btn-outline-relief",
        secondary:
          "btn-secondary-relief",
        ghost: "hover:bg-muted/60",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "btn-success-relief",
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
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
