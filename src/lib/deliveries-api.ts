import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  CreateDeliveryPayload,
  DeliveryDetail,
  DeliveryListItem,
  ListDeliveriesParams,
} from "@/types/delivery";

function buildQuery(params?: ListDeliveriesParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.runId) q.set("runId", params.runId);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.status) q.set("status", params.status);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const deliveriesApi = {
  list: (params?: ListDeliveriesParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<DeliveryListItem>>>(
      `/deliveries${buildQuery(params)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<DeliveryDetail>>(`/deliveries/${id}`),

  create: (payload: CreateDeliveryPayload) =>
    apiClient.post<ApiEnvelope<DeliveryDetail>>("/deliveries", payload),

  cancel: (id: string) => apiClient.patch<ApiEnvelope<DeliveryDetail>>(`/deliveries/${id}/cancel`),
};
