import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CompleteProductionOrderPayload,
  CreateProductionOrderPayload,
  ListProductionOrdersParams,
  ProductionOrderDetail,
  ProductionOrdersListPayload,
  UpdateProductionOrderPayload,
} from "@/types/production";

function buildQuery(params?: ListProductionOrdersParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.productId) q.set("productId", params.productId);
  if (params.status) q.set("status", params.status);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const productionApi = {
  list: (params?: ListProductionOrdersParams) =>
    apiClient.get<ApiEnvelope<ProductionOrdersListPayload>>(
      `/production-orders${buildQuery(params)}`
    ),

  get: (id: string) =>
    apiClient.get<ApiEnvelope<ProductionOrderDetail>>(`/production-orders/${id}`),

  create: (payload: CreateProductionOrderPayload) =>
    apiClient.post<ApiEnvelope<ProductionOrderDetail>>("/production-orders", payload),

  update: (id: string, payload: UpdateProductionOrderPayload) =>
    apiClient.patch<ApiEnvelope<ProductionOrderDetail>>(`/production-orders/${id}`, payload),

  plan: (id: string) =>
    apiClient.post<ApiEnvelope<ProductionOrderDetail>>(`/production-orders/${id}/plan`),

  start: (id: string) =>
    apiClient.post<ApiEnvelope<ProductionOrderDetail>>(`/production-orders/${id}/start`),

  complete: (id: string, payload: CompleteProductionOrderPayload) =>
    apiClient.post<ApiEnvelope<ProductionOrderDetail>>(
      `/production-orders/${id}/complete`,
      payload
    ),

  cancel: (id: string, reason?: string) =>
    apiClient.post<ApiEnvelope<ProductionOrderDetail>>(`/production-orders/${id}/cancel`, {
      reason,
    }),
};
