import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full min-w-0">
      <select
        ref={ref}
        className={cn(
          "focus:border-primary focus:ring-primary/20 h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-sm text-slate-900 transition-colors outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
);
Select.displayName = "Select";
