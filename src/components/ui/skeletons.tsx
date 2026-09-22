/**
 * Page-level skeleton screens that match the real layout so the loading
 * state feels native rather than showing a generic spinner.
 */

import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

// ─── Shared header row (page title + optional button) ────────────────────────

export function PageHeaderSkeleton({ withButton = false }: { withButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Pulse className="h-7 w-48" />
        <Pulse className="h-4 w-72" />
      </div>
      {withButton && <Pulse className="h-9 w-28 rounded-lg" />}
    </div>
  );
}

// ─── Filter bar (search + select) ────────────────────────────────────────────

export function FilterBarSkeleton({ selects = 1 }: { selects?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Pulse className="h-9 w-full max-w-xs rounded-lg" />
      {Array.from({ length: selects }).map((_, i) => (
        <Pulse key={i} className="h-9 w-36 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Table skeleton (header + rows) ──────────────────────────────────────────

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header row */}
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0"
        >
          {/* Name cell with avatar-style block */}
          <div className="flex flex-1 items-center gap-3">
            <Pulse className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-3 w-32" />
              <Pulse className="h-2.5 w-24" />
            </div>
          </div>
          {/* Remaining columns */}
          {Array.from({ length: cols - 1 }).map((__, j) => (
            <Pulse key={j} className={cn("h-3 flex-1", j === cols - 2 && "max-w-[80px]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Full table page skeleton (header + filters + table) ─────────────────────

export function TablePageSkeleton({
  withButton = true,
  filterSelects = 1,
  rows = 6,
  cols = 5,
}: {
  withButton?: boolean;
  filterSelects?: number;
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withButton={withButton} />
      <FilterBarSkeleton selects={filterSelects} />
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}

// ─── Stat cards skeleton (dashboard) ─────────────────────────────────────────

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-9 w-9 rounded-lg" />
          </div>
          <Pulse className="mt-4 h-7 w-16" />
          <Pulse className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

// ─── Card grid skeleton (settings, billing style) ────────────────────────────

export function CardGridSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <Pulse className="h-5 w-40" />
          <Pulse className="h-3 w-56" />
          <div className="space-y-3 pt-2">
            <Pulse className="h-9 w-full rounded-lg" />
            <Pulse className="h-9 w-full rounded-lg" />
            <Pulse className="h-9 w-2/3 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
