"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FEATURE_FLAGS_QUERY_KEY } from "@/constants/query-keys";
import { featureFlagsApi } from "@/lib/feature-flags-api";
import type { TenantFeatureFlagItem } from "@/types/feature-flags";

function isTenantFlag(flag: unknown): flag is TenantFeatureFlagItem {
  return typeof flag === "object" && flag !== null && "effectivelyEnabled" in flag;
}

/**
 * Read-only view of which product features are enabled for this workspace.
 * Only Super Admin can change flags (per tenant).
 */
export function TenantFeatureFlagsList() {
  const {
    data: res,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [FEATURE_FLAGS_QUERY_KEY],
    queryFn: featureFlagsApi.list,
  });

  const flags = (res?.data ?? []).filter(isTenantFlag);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <LoadingSkeleton rows={4} className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Failed to load feature flags" onRetry={() => refetch()} />;
  }

  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white">
        <EmptyState
          icon={Flag}
          title="No features available"
          description="Product features will appear here when the platform enables them for your workspace."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Features are managed by the platform. Contact support if you need a feature enabled.
      </p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {flags.map((flag) => {
          const enabled = flag.effectivelyEnabled;
          return (
            <div key={flag.slug} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{flag.name}</p>
                  <StatusBadge status={enabled ? "active" : "inactive"} />
                </div>
                {flag.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{flag.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {enabled ? "Enabled for this workspace" : "Not enabled"} ·{" "}
                  <code>{flag.slug}</code>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
