export type ProductBaseUnit = "PCS" | "LTR" | "KG";

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  volume: number | null;
  unit: string | null;
  sku: string | null;
  isActive: boolean;
  isReturnable: boolean;
  containerType: string | null;
  /** Price per baseUnit (PCS / LTR / KG). */
  defaultSellingPrice: number;
  baseUnit: ProductBaseUnit;
  unitsPerPack: number | null;
  packLabel: string | null;
  containerCapacity: number | null;
  allowFractionalQty: boolean;
  hasPackHelper: boolean;
  currentCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCost {
  id: string;
  tenantId: string;
  productId: string;
  costPerUnit: number;
  effectiveFrom: string;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface CurrentCostResult {
  productId: string;
  date: string;
  costPerUnit: number | null;
}

export interface CreateProductPayload {
  name: string;
  baseUnit: ProductBaseUnit;
  volume?: number | null;
  unit?: string | null;
  sku?: string | null;
  defaultSellingPrice: number;
  unitsPerPack?: number | null;
  packLabel?: string | null;
  containerCapacity?: number | null;
  allowFractionalQty?: boolean;
  isReturnable?: boolean;
  containerType?: string | null;
  isActive?: boolean;
  initialCostPerUnit?: number;
}

export interface UpdateProductPayload {
  name?: string;
  baseUnit?: ProductBaseUnit;
  volume?: number | null;
  unit?: string | null;
  sku?: string | null;
  defaultSellingPrice?: number;
  unitsPerPack?: number | null;
  packLabel?: string | null;
  containerCapacity?: number | null;
  allowFractionalQty?: boolean;
  isReturnable?: boolean;
  containerType?: string | null;
  isActive?: boolean;
}

export interface CreateProductCostPayload {
  costPerUnit: number;
  effectiveFrom?: string;
  notes?: string | null;
}

export interface ListProductsParams {
  search?: string;
  isActive?: boolean;
}

export function baseUnitLabel(unit: ProductBaseUnit): string {
  switch (unit) {
    case "LTR":
      return "L";
    case "KG":
      return "kg";
    default:
      return "pcs";
  }
}
