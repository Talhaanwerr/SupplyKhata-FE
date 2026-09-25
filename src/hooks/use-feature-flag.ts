"use client";

import { useQuery } from "@tanstack/react-query";
import { FEATURE_FLAGS_QUERY_KEY } from "@/constants/query-keys";
import { featureFlagsApi } from "@/lib/feature-flags-api";
import type { TenantFeatureFlagItem } from "@/types/feature-flags";

function isTenantFlag(flag: unknown): flag is TenantFeatureFlagItem {
  return typeof flag === "object" && flag !== null && "effectivelyEnabled" in flag;
}

/**
 * Tenant-scoped feature flag (effectivelyEnabled from GET /feature-flags).
 * Defaults to false while loading / on error so gated UI stays hidden until confirmed.
 */
export function useFeatureFlag(slug: string): {
  enabled: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: [FEATURE_FLAGS_QUERY_KEY],
    queryFn: featureFlagsApi.list,
    staleTime: 60_000,
  });

  const flags = (data?.data ?? []).filter(isTenantFlag);
  const flag = flags.find((f) => f.slug === slug);
  return {
    enabled: flag?.effectivelyEnabled === true,
    isLoading,
  };
}
