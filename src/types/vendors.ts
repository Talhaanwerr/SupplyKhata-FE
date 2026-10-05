import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDetail extends Vendor {
  openPayables: {
    total: number;
    billedTotal?: number;
    paidTotal?: number;
    note: string;
  };
}

export interface ListVendorsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export type VendorsListPayload = { items: Vendor[]; meta: PaginationMeta };
export type VendorsListResponse = ApiEnvelope<VendorsListPayload>;
export type VendorDetailResponse = ApiEnvelope<VendorDetail>;

export interface CreateVendorPayload {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
  openingPayables?: number;
}

export interface UpdateVendorPayload {
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
  openingPayables?: number;
}
