import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export type ProductionOrderStatus = "DRAFT" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ProductionExpectedRaw {
  rawMaterialId: string;
  qtyPerOutputUnit: number;
  expectedQty: number;
  rawMaterial?: {
    id: string;
    name: string;
    unit: string;
    sku: string | null;
  };
}

export interface ProductionConsumeLine {
  id: string;
  rawMaterialId: string;
  qtyPerOutputUnit: number;
  qtyConsumed: number;
  rawMaterial?: {
    id: string;
    name: string;
    unit: string;
    sku: string | null;
  };
}

export interface ProductionOrderListItem {
  id: string;
  tenantId: string;
  productId: string;
  bomId: string;
  locationId: string;
  plannedQty: number;
  actualQty: number | null;
  scrapQty: number | null;
  status: ProductionOrderStatus;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; sku: string | null; baseUnit: string };
  location?: { id: string; name: string; isDefault: boolean };
  bom?: { id: string; name: string | null; version: number; isActive: boolean };
}

export interface ProductionOrderDetail extends ProductionOrderListItem {
  varianceNote: string | null;
  scrapReason: string | null;
  cancelReason: string | null;
  createdByUserId: string | null;
  bom?: {
    id: string;
    name: string | null;
    version: number;
    isActive: boolean;
    lines?: Array<{
      id: string;
      rawMaterialId: string;
      qtyPerOutputUnit: number;
      rawMaterial?: { id: string; name: string; unit: string; sku: string | null };
    }>;
  };
  expectedRaw: ProductionExpectedRaw[];
  consumeLines: ProductionConsumeLine[];
}

export interface ListProductionOrdersParams {
  page?: number;
  limit?: number;
  productId?: string;
  status?: ProductionOrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

export type ProductionOrdersListPayload = {
  items: ProductionOrderListItem[];
  meta: PaginationMeta;
};

export interface CreateProductionOrderPayload {
  productId: string;
  bomId?: string;
  locationId?: string;
  plannedQty: number;
  notes?: string | null;
}

export interface UpdateProductionOrderPayload {
  productId?: string;
  bomId?: string;
  locationId?: string;
  plannedQty?: number;
  notes?: string | null;
}

export interface CompleteProductionOrderPayload {
  actualQty: number;
  scrapQty?: number | null;
  varianceNote?: string | null;
  scrapReason?: string | null;
}

export type ProductionOrdersListResponse = ApiEnvelope<ProductionOrdersListPayload>;
export type ProductionOrderDetailResponse = ApiEnvelope<ProductionOrderDetail>;
