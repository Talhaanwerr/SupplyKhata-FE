import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export type RawMaterialUnit = "KG" | "LTR" | "PCS";

export interface BomRawMaterialRef {
  id: string;
  name: string;
  unit: RawMaterialUnit | string;
  sku: string | null;
  isActive: boolean;
}

export interface BomProductRef {
  id: string;
  name: string;
  sku: string | null;
  isActive: boolean;
}

export interface BomLine {
  id: string;
  rawMaterialId: string;
  qtyPerOutputUnit: number;
  rawMaterial?: BomRawMaterialRef;
}

export interface BomDetail {
  id: string;
  tenantId: string;
  productId: string;
  name: string | null;
  notes: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  product?: BomProductRef;
  lines: BomLine[];
}

export interface ListBomsParams {
  page?: number;
  limit?: number;
  productId?: string;
  isActive?: boolean;
}

export type BomsListPayload = {
  items: BomDetail[];
  meta: PaginationMeta;
};

export interface BomLineInput {
  rawMaterialId: string;
  qtyPerOutputUnit: number;
}

export interface CreateBomPayload {
  productId: string;
  name?: string | null;
  notes?: string | null;
  isActive?: boolean;
  lines: BomLineInput[];
}

export interface UpdateBomPayload {
  name?: string | null;
  notes?: string | null;
  isActive?: boolean;
  lines?: BomLineInput[];
}

export type BomsListResponse = ApiEnvelope<BomsListPayload>;
export type BomDetailResponse = ApiEnvelope<BomDetail | null>;
