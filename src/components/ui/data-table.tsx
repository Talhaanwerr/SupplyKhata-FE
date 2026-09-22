"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string) => void;
  sortKey?: string;
  /** Current sort direction — reserved for column header indicators */
  sortOrder?: "asc" | "desc";
  emptyState?: React.ReactNode;
  className?: string;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  onSort,
  sortKey,
  sortOrder: _sortOrder,
  emptyState,
  className,
}: DataTableProps<T>) {
  const isEmpty = !isLoading && data.length === 0;

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white", className)}>
      {/* Horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase",
                    col.sortable && "cursor-pointer select-none hover:text-slate-700",
                    col.className
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <ArrowUpDown
                        className={cn(
                          "h-3.5 w-3.5",
                          sortKey === col.key ? "text-primary" : "text-slate-300"
                        )}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={columns.length} />
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="py-0">
                  {emptyState ?? (
                    <div className="py-12 text-center text-sm text-slate-400">No data found.</div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-slate-700", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isEmpty && onPageChange && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}
