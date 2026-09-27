import type { ApiEnvelope } from "@/types/api";

export interface TenantSettings {
  id: string;
  tenantId: string;
  orgName: string | null;
  logo: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  dateFormat: string;
  invoicePrefix: string;
  themeColor: string;
  allowedDomains: string[];
  /** Empty more = all sidebar tabs stay primary (no server defaults). */
  sidebarNav?: { more: string[] };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsPayload {
  orgName?: string;
  logo?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  invoicePrefix?: string;
  themeColor?: string;
  allowedDomains?: string[];
  sidebarNavMore?: string[];
}

export interface PlatformSettings {
  id: string;
  appName: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultCurrency: string;
  updatedAt: string;
}

export interface UpdatePlatformSettingsPayload {
  appName?: string;
  supportEmail?: string;
  defaultTimezone?: string;
  defaultCurrency?: string;
}

export type SettingsResponse = ApiEnvelope<TenantSettings>;
