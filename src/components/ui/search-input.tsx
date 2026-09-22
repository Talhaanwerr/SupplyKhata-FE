"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  placeholder = "Search…",
  value: externalValue = "",
  onChange,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue);
  const [prevExternal, setPrevExternal] = useState(externalValue);

  // Sync from parent without an effect (React-recommended prop→state adjustment)
  if (externalValue !== prevExternal) {
    setPrevExternal(externalValue);
    setInternalValue(externalValue);
  }

  // Debounce outbound changes
  useEffect(() => {
    const timer = setTimeout(() => onChange(internalValue), debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalValue, debounceMs]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="focus:border-primary focus:ring-primary/20 h-9 w-full rounded-lg border border-slate-200 bg-white pr-8 pl-9 text-sm transition-colors outline-none focus:ring-2"
      />
      {internalValue && (
        <button
          onClick={() => setInternalValue("")}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
