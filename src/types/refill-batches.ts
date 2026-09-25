export interface RefillBatchProduct {
  id: string;
  name: string;
}

export interface RefillBatchCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface RefillBatch {
  id: string;
  tenantId: string;
  productId: string;
  date: string;
  cansFilledCount: number;
  costPerUnit: number;
  totalCost: number;
  notes: string | null;
  createdById: string | null;
  remainingCount: number;
  product: RefillBatchProduct;
  createdBy?: RefillBatchCreatedBy | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRefillBatchPayload {
  productId: string;
  date: string;
  cansFilledCount: number;
  costPerUnit: number;
  notes?: string | null;
}

export type UpdateRefillBatchPayload = Partial<CreateRefillBatchPayload>;

export interface ListRefillBatchesParams {
  page?: number;
  limit?: number;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}
