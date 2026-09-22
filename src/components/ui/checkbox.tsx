import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  description?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;
    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "group flex cursor-pointer items-start gap-2.5",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div className="group-has-[:checked]:border-primary group-has-[:checked]:bg-primary relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white transition-colors">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            {...props}
          />
          <Check
            className="hidden h-2.5 w-2.5 text-white group-has-[:checked]:block"
            strokeWidth={3}
          />
        </div>
        {(label || description) && (
          <div className="min-w-0">
            {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
            {description && <p className="text-xs text-slate-400">{description}</p>}
          </div>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
