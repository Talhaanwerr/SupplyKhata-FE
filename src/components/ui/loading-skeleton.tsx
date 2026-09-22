"use client";

import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  /** Number of skeleton rows to render */
  rows?: number;
}

export function LoadingSkeleton({ className, rows }: LoadingSkeletonProps) {
  if (rows && rows > 1) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={cn("h-4 animate-pulse rounded bg-slate-200", className)} />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("h-4 animate-pulse rounded bg-slate-200", className)}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}
