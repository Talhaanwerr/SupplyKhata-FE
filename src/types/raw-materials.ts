import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export type RawMaterialUnit = "KG" | "LTR" | "PCS";

export type RawMaterialMovementType =
  "OPENING" | "ADJUSTMENT" | "PURCHASE_IN" | "PRODUCTION_CONSUME";

export interface RawMaterial {
  id: string;
  tenantId: string;
  name: string;
  unit: RawMaterialUnit;
  sku: string | null;
  defaultCost: number | null;
  reorderLevel: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on list responses */
  onHandQty?: number;
  isLowStock?: boolean;
}

export interface RawMaterialCost {
  id: string;
  tenantId: string;
  rawMaterialId: string;
  costPerUnit: number;
  effectiveFrom: string;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface CreateRawMaterialCostPayload {
  costPerUnit: number;
  effectiveFrom?: string;
  notes?: string | null;
}

export interface RawMaterialBalanceRow {
  id: string;
  quantity: number;
  locationId: string;
  updatedAt: string;
  location: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    isDefault: boolean;
  };
}

export interface RawMaterialDetail extends RawMaterial {
  balances: RawMaterialBalanceRow[];
}

export interface ListRawMaterialsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  lowStockOnly?: boolean;
}

export type RawMaterialsListPayload = { items: RawMaterial[]; meta: PaginationMeta };
export type RawMaterialsListResponse = ApiEnvelope<RawMaterialsListPayload>;
export type RawMaterialDetailResponse = ApiEnvelope<RawMaterialDetail>;

export interface CreateRawMaterialPayload {
  name: string;
  unit: RawMaterialUnit;
  sku?: string | null;
  defaultCost?: number | null;
  reorderLevel?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateRawMaterialPayload {
  name?: string;
  unit?: RawMaterialUnit;
  sku?: string | null;
  defaultCost?: number | null;
  reorderLevel?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface ListRawBalancesParams {
  page?: number;
  limit?: number;
  locationId?: string;
  rawMaterialId?: string;
  lowStockOnly?: boolean;
}

export interface RawBalanceListItem {
  id: string;
  quantity: number;
  locationId: string;
  rawMaterialId: string;
  updatedAt: string;
  rawMaterial: {
    id: string;
    name: string;
    sku: string | null;
    unit: RawMaterialUnit;
    reorderLevel: number | null;
    isActive: boolean;
  };
  location: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    isDefault: boolean;
  };
}

export type RawBalancesListPayload = { items: RawBalanceListItem[]; meta: PaginationMeta };

export interface ListRawMovementsParams {
  page?: number;
  limit?: number;
  locationId?: string;
  rawMaterialId?: string;
  type?: RawMaterialMovementType;
  dateFrom?: string;
  dateTo?: string;
}

export interface RawMovementListItem {
  id: string;
  type: RawMaterialMovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
  rawMaterial: {
    id: string;
    name: string;
    sku: string | null;
    unit: RawMaterialUnit;
  };
  location: {
    id: string;
    name: string;
    type: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export type RawMovementsListPayload = { items: RawMovementListItem[]; meta: PaginationMeta };
