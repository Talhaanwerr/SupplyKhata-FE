"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  fromLabel?: string;
  toLabel?: string;
  disabled?: boolean;
}

/**
 * Simple accessible date-range inputs (native date pickers).
 * Emits ISO date strings (YYYY-MM-DD).
 */
export function DateRangePicker({
  value,
  onChange,
  className,
  fromLabel = "From",
  toLabel = "To",
  disabled,
}: DateRangePickerProps) {
  const [from, setFrom] = useState(value?.from ?? "");
  const [to, setTo] = useState(value?.to ?? "");

  function update(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    onChange({ from: nextFrom, to: nextTo });
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <div className="space-y-1">
        <label className="flex items-center gap-1 text-xs font-medium text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          {fromLabel}
        </label>
        <Input
          type="date"
          value={from}
          disabled={disabled}
          max={to || undefined}
          onChange={(e) => update(e.target.value, to)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">{toLabel}</label>
        <Input
          type="date"
          value={to}
          disabled={disabled}
          min={from || undefined}
          onChange={(e) => update(from, e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
