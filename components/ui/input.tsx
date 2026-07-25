import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor={inputId}>
        {label ? <span className="text-muted">{label}</span> : null}
        <input
          id={inputId}
          className={cn(
            "h-11 rounded-md border border-border bg-surface-raised/80 px-3 text-sm text-foreground outline-none transition duration-200 placeholder:text-muted-soft hover:border-border-strong focus:border-primary focus:bg-surface-elevated focus:shadow-[var(--shadow-focus)]",
            className
          )}
          ref={ref}
          {...props}
        />
      </label>
    );
  }
);
Input.displayName = "Input";
