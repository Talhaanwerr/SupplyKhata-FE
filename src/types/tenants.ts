/** Types mirroring the backend TenantsService shapes. */

import type { TenantStatus } from "@/types";

/** Returned by GET /tenants (list) */
export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  subdomain: string | null;
  status: TenantStatus;
  timezone: string;
  currency: string;
  logo: string | null;
  ownerUserId: string | null;
  createdAt: string;
}

/** Subscription summary nested in TenantDetail */
export interface TenantSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  plan: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface TenantFeatureFlagSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isGlobal: boolean;
  tenantEnabled: boolean | null;
  effectivelyEnabled: boolean;
}

/** Returned by GET /tenants/:id */
export interface TenantDetail extends TenantListItem {
  subscriptions: TenantSubscription[];
  settings: {
    orgName: string | null;
    timezone: string;
    currency: string;
    invoicePrefix: string;
  } | null;
  _count: { users?: number; members?: number };
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    memberStatus: string;
    emailVerified: boolean;
    emailVerifiedAt?: string | null;
  } | null;
  featureFlags: TenantFeatureFlagSummary[];
}

/** POST /tenants */
export interface CreateTenantPayload {
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string;
  ownerUserId?: string;
  timezone?: string;
  currency?: string;
  logo?: string;
  featureFlags?: Array<{ slug: string; enabled: boolean }>;
}

/** Returned by POST /tenants (includes invited owner summary) */
export interface CreateTenantResult extends TenantListItem {
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

/** PATCH /tenants/:id */
export interface UpdateTenantPayload {
  name?: string;
  domain?: string;
  subdomain?: string;
  ownerUserId?: string;
  timezone?: string;
  currency?: string;
  logo?: string;
}

export interface ListTenantsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface TenantStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  cancelled: number;
  totalUsers: number;
}
