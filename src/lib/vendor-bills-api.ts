import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CreateVendorBillPayload,
  ListVendorBillsParams,
  PayVendorBillPayload,
  VendorBillDetail,
  VendorBillsListPayload,
  VendorDuesPayload,
  VendorLedgerPayload,
} from "@/types/vendor-bills";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const vendorBillsApi = {
  list: (params?: ListVendorBillsParams) =>
    apiClient.get<ApiEnvelope<VendorBillsListPayload>>(
      `/vendor-bills${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<VendorBillDetail>>(`/vendor-bills/${id}`),

  create: (payload: CreateVendorBillPayload) =>
    apiClient.post<ApiEnvelope<VendorBillDetail>>("/vendor-bills", payload),

  createFromGoodsReceipt: (goodsReceiptId: string, payload?: { dueDate?: string | null }) =>
    apiClient.post<ApiEnvelope<VendorBillDetail>>(
      `/vendor-bills/from-goods-receipt/${goodsReceiptId}`,
      payload ?? {}
    ),

  listLedger: (
    vendorId: string,
    params?: { page?: number; limit?: number; from?: string; to?: string }
  ) =>
    apiClient.get<ApiEnvelope<VendorLedgerPayload>>(
      `/vendor-bills/ledger/${vendorId}${buildQuery(params)}`
    ),

  listDues: (params?: { date?: string }) =>
    apiClient.get<ApiEnvelope<VendorDuesPayload>>(`/vendor-bills/dues${buildQuery(params)}`),

  setDueDate: (id: string, dueDate: string) =>
    apiClient.patch<ApiEnvelope<VendorBillDetail>>(`/vendor-bills/${id}/due-date`, {
      dueDate,
    }),

  pay: (id: string, payload: PayVendorBillPayload) =>
    apiClient.post<ApiEnvelope<VendorBillDetail>>(`/vendor-bills/${id}/pay`, payload),

  void: (id: string, reason: string) =>
    apiClient.post<ApiEnvelope<VendorBillDetail>>(`/vendor-bills/${id}/void`, { reason }),
};
