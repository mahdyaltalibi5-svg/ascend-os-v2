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
        {label ? <span>{label}</span> : null}
        <input
          id={inputId}
          className={cn(
            "h-11 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20",
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
