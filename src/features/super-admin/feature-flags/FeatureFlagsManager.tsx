"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { FEATURE_FLAGS_QUERY_KEY, TENANTS_QUERY_KEY } from "@/constants/query-keys";
import { featureFlagsApi } from "@/lib/feature-flags-api";
import { tenantsApi } from "@/lib/tenants-api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { getSafeErrorMessage } from "@/lib/safe-error";
import type { TenantFeatureFlagItem } from "@/types/feature-flags";

/**
 * Super Admin Feature Flags manager.
 * Flags are seeded with the product — SA does not create them here.
 * Pick a tenant, then enable/disable each catalog feature for that tenant.
 */
export function FeatureFlagsManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");

  const {
    data: tenantsRes,
    isLoading: tenantsLoading,
    isError: tenantsError,
    refetch: refetchTenants,
  } = useQuery({
    queryKey: [TENANTS_QUERY_KEY, "flag-picker"],
    queryFn: () => tenantsApi.list({ page: 1, limit: 100 }),
  });

  const tenants = tenantsRes?.data?.items ?? [];

  const {
    data: flagsRes,
    isLoading: flagsLoading,
    isError: flagsError,
    refetch: refetchFlags,
  } = useQuery({
    queryKey: [FEATURE_FLAGS_QUERY_KEY, "admin-tenant", tenantId],
    queryFn: () => featureFlagsApi.listForTenant(tenantId),
    enabled: !!tenantId,
  });

  const flags = (flagsRes?.data ?? []) as TenantFeatureFlagItem[];

  const toggle = useApiMutation(
    ({ slug, enable }: { slug: string; enable: boolean }) =>
      enable
        ? featureFlagsApi.adminEnable(tenantId, slug)
        : featureFlagsApi.adminDisable(tenantId, slug),
    {
      onSuccess: (_, vars) => {
        qc.invalidateQueries({ queryKey: [FEATURE_FLAGS_QUERY_KEY, "admin-tenant", tenantId] });
        toast({
          title: vars.enable ? "Feature enabled" : "Feature disabled",
          description: `Updated for the selected tenant.`,
          variant: "success",
        });
      },
      onError: (err) =>
        toast({
          title: "Update failed",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  if (tenantsLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <LoadingSkeleton rows={3} className="h-12 w-full" />
      </div>
    );
  }

  if (tenantsError) {
    return <ErrorState title="Failed to load tenants" onRetry={() => refetchTenants()} />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-1 text-sm font-medium text-slate-900">Per-tenant feature access</p>
        <p className="mb-4 text-sm text-slate-500">
          Feature flags are added as the product grows (via seed/migrations). Select a tenant below
          to enable or disable features for that workspace only.
        </p>
        <label className="mb-1 block text-xs font-medium text-slate-500">Tenant</label>
        <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="max-w-md">
          <option value="">Select a tenant…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.slug})
            </option>
          ))}
        </Select>
      </div>

      {!tenantId ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Flag}
            title="Select a tenant"
            description="Choose a tenant above to manage which product features they can use."
          />
        </div>
      ) : flagsLoading ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <LoadingSkeleton rows={4} className="h-12 w-full" />
        </div>
      ) : flagsError ? (
        <ErrorState title="Failed to load feature flags" onRetry={() => refetchFlags()} />
      ) : flags.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Flag}
            title="No feature flags in catalog"
            description="Run the database seed (or add flags in code) so product features appear here."
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {flags.map((flag) => {
            const enabled = flag.effectivelyEnabled;
            const busy =
              toggle.isPending &&
              (toggle.variables as { slug: string } | undefined)?.slug === flag.slug;

            return (
              <div key={flag.slug} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{flag.name}</p>
                    <StatusBadge status={enabled ? "active" : "inactive"} />
                    {flag.isGlobal && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                        Always on
                      </span>
                    )}
                  </div>
                  {flag.description && (
                    <p className="mt-0.5 text-sm text-slate-500">{flag.description}</p>
                  )}
                  <code className="text-xs text-slate-400">{flag.slug}</code>
                </div>

                <button
                  type="button"
                  disabled={busy || flag.isGlobal}
                  title={
                    flag.isGlobal
                      ? "Global features are always on for every tenant"
                      : enabled
                        ? "Disable for this tenant"
                        : "Enable for this tenant"
                  }
                  aria-label={enabled ? `Disable ${flag.name}` : `Enable ${flag.name}`}
                  className="hover:text-primary ml-4 shrink-0 text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => toggle.mutate({ slug: flag.slug, enable: !enabled })}
                >
                  {busy ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : enabled ? (
                    <ToggleRight className="text-primary h-8 w-8" />
                  ) : (
                    <ToggleLeft className="h-8 w-8" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
