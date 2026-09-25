import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  CreateRefillBatchPayload,
  ListRefillBatchesParams,
  RefillBatch,
  UpdateRefillBatchPayload,
} from "@/types/refill-batches";

function buildQuery(params?: ListRefillBatchesParams & { productId?: string }): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.productId) q.set("productId", params.productId);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const refillBatchesApi = {
  list: (params?: ListRefillBatchesParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<RefillBatch>>>(
      `/refill-batches${buildQuery(params)}`
    ),

  available: (productId: string) =>
    apiClient.get<ApiEnvelope<RefillBatch[]>>(
      `/refill-batches/available${buildQuery({ productId })}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<RefillBatch>>(`/refill-batches/${id}`),

  create: (payload: CreateRefillBatchPayload) =>
    apiClient.post<ApiEnvelope<RefillBatch>>("/refill-batches", payload),

  update: (id: string, payload: UpdateRefillBatchPayload) =>
    apiClient.patch<ApiEnvelope<RefillBatch>>(`/refill-batches/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/refill-batches/${id}`),
};
