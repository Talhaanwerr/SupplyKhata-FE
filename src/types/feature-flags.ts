import type { ApiEnvelope } from "@/types/api";

/** Super-admin global flag shape */
export interface FeatureFlagItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Tenant-scoped flag with effective access */
export interface TenantFeatureFlagItem extends FeatureFlagItem {
  tenantEnabled: boolean | null;
  effectivelyEnabled: boolean;
}

export interface CreateFeatureFlagPayload {
  name: string;
  slug: string;
  description?: string;
  isGlobal?: boolean;
  isActive?: boolean;
}

export interface UpdateFeatureFlagPayload {
  name?: string;
  description?: string;
  isGlobal?: boolean;
  isActive?: boolean;
}

export interface FeatureAccessResult {
  slug: string;
  enabled: boolean;
}

export type FeatureFlagsListResponse = ApiEnvelope<(FeatureFlagItem | TenantFeatureFlagItem)[]>;
