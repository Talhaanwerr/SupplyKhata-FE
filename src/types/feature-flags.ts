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

/** Seeded product flags — keep in sync with BE prisma/seed STARTER_FEATURE_FLAGS */
export const FEATURE_FLAG_SLUGS = {
  RETURNABLE_CONTAINERS: "returnable-containers",
  PACK_HELPERS: "pack-helpers",
  PLANT_FILL: "plant-fill",
  ORDERS: "orders",
  POS: "pos",
  INVOICES: "invoices",
  INVENTORY: "inventory",
  WAREHOUSE: "warehouse",
  VENDORS: "vendors",
  RAW_MATERIALS: "raw-materials",
  PURCHASE_ORDERS: "purchase-orders",
  VENDOR_BILLS: "vendor-bills",
  PRODUCTION: "production",
} as const;

export type FeatureFlagsListResponse = ApiEnvelope<(FeatureFlagItem | TenantFeatureFlagItem)[]>;
