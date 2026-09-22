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
  defaultSellingPrice: number;
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
  volume?: number | null;
  unit?: string | null;
  sku?: string | null;
  defaultSellingPrice: number;
  isReturnable?: boolean;
  containerType?: string | null;
  isActive?: boolean;
  initialCostPerUnit?: number;
}

export interface UpdateProductPayload {
  name?: string;
  volume?: number | null;
  unit?: string | null;
  sku?: string | null;
  defaultSellingPrice?: number;
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
