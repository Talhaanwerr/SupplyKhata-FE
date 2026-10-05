import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CreatePurchaseOrderPayload,
  GoodsReceiptDetail,
  GoodsReceiptsListPayload,
  ListPurchaseOrdersParams,
  PurchaseOrderDetail,
  PurchaseOrdersListPayload,
  UpdatePurchaseOrderPayload,
} from "@/types/purchase-orders";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const purchaseOrdersApi = {
  list: (params?: ListPurchaseOrdersParams) =>
    apiClient.get<ApiEnvelope<PurchaseOrdersListPayload>>(
      `/purchase-orders${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<PurchaseOrderDetail>>(`/purchase-orders/${id}`),

  create: (payload: CreatePurchaseOrderPayload) =>
    apiClient.post<ApiEnvelope<PurchaseOrderDetail>>("/purchase-orders", payload),

  update: (id: string, payload: UpdatePurchaseOrderPayload) =>
    apiClient.patch<ApiEnvelope<PurchaseOrderDetail>>(`/purchase-orders/${id}`, payload),

  send: (id: string) =>
    apiClient.post<ApiEnvelope<PurchaseOrderDetail>>(`/purchase-orders/${id}/send`),

  cancel: (id: string, reason: string) =>
    apiClient.post<ApiEnvelope<PurchaseOrderDetail>>(`/purchase-orders/${id}/cancel`, {
      reason,
    }),

  listReceipts: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiEnvelope<GoodsReceiptsListPayload>>(
      `/purchase-orders/${id}/receipts${buildQuery(params)}`
    ),

  createReceipt: (
    id: string,
    payload: {
      locationId?: string;
      receiptDate: string;
      notes?: string | null;
      billDueDate?: string | null;
      lines: { purchaseOrderLineId: string; qtyReceived: number }[];
    }
  ) => apiClient.post<ApiEnvelope<GoodsReceiptDetail>>(`/purchase-orders/${id}/receipts`, payload),
};

export const goodsReceiptsApi = {
  get: (id: string) => apiClient.get<ApiEnvelope<GoodsReceiptDetail>>(`/goods-receipts/${id}`),
};
