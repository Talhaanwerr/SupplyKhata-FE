import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  FeatureFlagItem,
  TenantFeatureFlagItem,
  FeatureAccessResult,
} from "@/types/feature-flags";

export const featureFlagsApi = {
  /** Catalog list (SA) or tenant-scoped effective flags. */
  list: () =>
    apiClient.get<ApiEnvelope<(FeatureFlagItem | TenantFeatureFlagItem)[]>>("/feature-flags"),

  checkAccess: (slug: string) =>
    apiClient.get<ApiEnvelope<FeatureAccessResult>>(`/feature-flags/${slug}/access`),

  /** SA: flags + override state for one tenant. */
  listForTenant: (tenantId: string) =>
    apiClient.get<ApiEnvelope<TenantFeatureFlagItem[]>>(`/feature-flags/admin/tenants/${tenantId}`),

  /** SA: force-enable for tenant. */
  adminEnable: (tenantId: string, slug: string) =>
    apiClient.post<ApiEnvelope<null>>(`/feature-flags/admin/tenants/${tenantId}/${slug}/enable`),

  /** SA: force-disable for tenant. */
  adminDisable: (tenantId: string, slug: string) =>
    apiClient.post<ApiEnvelope<null>>(`/feature-flags/admin/tenants/${tenantId}/${slug}/disable`),

  /** SA: clear override (revert to default). */
  adminReset: (tenantId: string, slug: string) =>
    apiClient.delete<ApiEnvelope<null>>(
      `/feature-flags/admin/tenants/${tenantId}/${slug}/override`
    ),
};
