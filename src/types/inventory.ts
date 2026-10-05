import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export type StockLocationType = "WAREHOUSE" | "PLANT" | "STORE";

export type StockMovementType =
  | "OPENING"
  | "ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "PURCHASE_IN"
  | "PRODUCTION_IN"
  | "PRODUCTION_CONSUME"
  | "SALE_OUT";

export interface StockLocation {
  id: string;
  name: string;
  type: StockLocationType;
  code: string | null;
  notes: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockBalanceRow {
  id: string;
  quantity: number;
  updatedAt: string;
  isLowStock: boolean;
  product: {
    id: string;
    name: string;
    sku: string | null;
    baseUnit: string;
    reorderLevel: number | null;
  };
  location: StockLocation;
}

export interface StockMovementRow {
  id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  transferGroupId: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string | null; baseUnit: string };
  location: StockLocation;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface ListBalancesParams {
  page?: number;
  limit?: number;
  locationId?: string;
  productId?: string;
  lowStockOnly?: boolean;
}

export interface ListMovementsParams {
  page?: number;
  limit?: number;
  locationId?: string;
  productId?: string;
  type?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
}

export type BalancesListPayload = { items: StockBalanceRow[]; meta: PaginationMeta };
export type MovementsListPayload = { items: StockMovementRow[]; meta: PaginationMeta };

export type BalancesListResponse = ApiEnvelope<BalancesListPayload>;
export type MovementsListResponse = ApiEnvelope<MovementsListPayload>;
export type LocationsListResponse = ApiEnvelope<StockLocation[]>;
