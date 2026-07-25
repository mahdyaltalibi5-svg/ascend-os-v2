import * as React from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor={selectId}>
        {label ? <span className="text-muted">{label}</span> : null}
        <select
          id={selectId}
          className={cn(
            "h-11 rounded-md border border-border bg-surface-raised/80 px-3 text-sm text-foreground outline-none transition duration-200 hover:border-border-strong focus:border-primary focus:bg-surface-elevated focus:shadow-[var(--shadow-focus)]",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
      </label>
    );
  }
);
Select.displayName = "Select";
