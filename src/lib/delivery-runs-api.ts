import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  CloseDeliveryRunPayload,
  CreateDeliveryRunPayload,
  DeliveryRunDetail,
  DeliveryRunListItem,
  DeliveryRunSummary,
  ListDeliveryRunsParams,
  UpdateDeliveryRunPayload,
} from "@/types/delivery";

function buildQuery(params?: ListDeliveryRunsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.riderId) q.set("riderId", params.riderId);
  if (params.status) q.set("status", params.status);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const deliveryRunsApi = {
  list: (params?: ListDeliveryRunsParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<DeliveryRunListItem>>>(
      `/delivery-runs${buildQuery(params)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<DeliveryRunDetail>>(`/delivery-runs/${id}`),

  create: (payload: CreateDeliveryRunPayload) =>
    apiClient.post<ApiEnvelope<DeliveryRunDetail>>("/delivery-runs", payload),

  update: (id: string, payload: UpdateDeliveryRunPayload) =>
    apiClient.patch<ApiEnvelope<DeliveryRunDetail>>(`/delivery-runs/${id}`, payload),

  close: (id: string, payload: CloseDeliveryRunPayload) =>
    apiClient.patch<ApiEnvelope<{ run: DeliveryRunDetail; summary: DeliveryRunSummary }>>(
      `/delivery-runs/${id}/close`,
      payload
    ),

  summary: (id: string) =>
    apiClient.get<ApiEnvelope<DeliveryRunSummary>>(`/delivery-runs/${id}/summary`),
};
