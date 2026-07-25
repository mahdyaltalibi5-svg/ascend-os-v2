import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-[0_12px_30px_hsl(var(--primary)/0.22)] hover:bg-primary/90 hover:shadow-[0_16px_38px_hsl(var(--primary)/0.28)]",
        secondary:
          "border border-border bg-surface-raised/90 text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] hover:border-border-strong hover:bg-surface-elevated",
        ghost:
          "text-muted hover:bg-surface-raised/80 hover:text-foreground focus-visible:bg-surface-raised",
        danger:
          "bg-danger text-white shadow-[0_12px_30px_hsl(var(--danger)/0.18)] hover:bg-danger/90"
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3",
        icon: "h-11 w-11 px-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { buttonVariants };
