"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Loader2, X } from "lucide-react";
import { customersApi } from "@/lib/customers-api";
import { CUSTOMERS_QUERY_KEY } from "@/constants/query-keys";
import { cn } from "@/lib/utils";
import type { CustomerListItem } from "@/types/customers";

interface CustomerSearchSelectProps {
  value: string;
  onChange: (customerId: string, customer?: CustomerListItem | null) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Preset label when value is set but not yet in search results */
  initialLabel?: string;
  className?: string;
}

export function CustomerSearchSelect({
  value,
  onChange,
  error,
  disabled,
  placeholder = "Search customer by name or phone…",
  initialLabel,
  className,
}: CustomerSearchSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  /** Label chosen by user pick; kept only while it matches `value`. */
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = open && !disabled;

  const { data, isFetching, isError } = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, "typeahead", debounced],
    queryFn: () =>
      customersApi.list({
        search: debounced || undefined,
        status: "ACTIVE",
        limit: 20,
      }),
    enabled,
  });

  const items = data?.data?.items ?? [];

  const needsPresetLabel = !!value && picked?.id !== value && !(initialLabel && value);

  const presetQuery = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, "preset", value],
    queryFn: () => customersApi.get(value),
    enabled: needsPresetLabel,
  });

  const presetCustomer = presetQuery.data?.data;
  const selectedLabel = !value
    ? ""
    : picked?.id === value
      ? picked.label
      : initialLabel ||
        (presetCustomer && presetCustomer.id === value
          ? `${presetCustomer.name} (${presetCustomer.phone})`
          : "");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayValue = open ? query : selectedLabel;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={!!error}
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            if (value) {
              setPicked(null);
              onChange("", null);
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setQuery("");
            }
          }}
          className={cn(
            "focus:border-primary focus:ring-primary/20 h-9 w-full rounded-lg border border-slate-200 bg-white pr-16 pl-3 text-sm outline-none focus:ring-2",
            error && "border-red-400",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-500"
          )}
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              aria-label="Clear customer"
              className="rounded p-1 text-slate-400 hover:text-slate-600"
              onClick={() => {
                onChange("", null);
                setPicked(null);
                setQuery("");
                setOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-md"
        >
          {isFetching && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </li>
          )}
          {isError && <li className="px-3 py-2 text-sm text-red-600">Could not load customers</li>}
          {!isFetching && !isError && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              {debounced ? "No customers found" : "Type to search customers"}
            </li>
          )}
          {items.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === value}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50",
                  c.id === value && "bg-slate-50"
                )}
                onClick={() => {
                  const label = `${c.name} (${c.phone})`;
                  setPicked({ id: c.id, label });
                  setQuery("");
                  setOpen(false);
                  onChange(c.id, c);
                }}
              >
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-500">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
