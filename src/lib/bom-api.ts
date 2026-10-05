import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  BomDetail,
  BomsListPayload,
  CreateBomPayload,
  ListBomsParams,
  UpdateBomPayload,
} from "@/types/bom";

function buildQuery(params?: ListBomsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.productId) q.set("productId", params.productId);
  if (params.isActive != null) q.set("isActive", String(params.isActive));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const bomApi = {
  list: (params?: ListBomsParams) =>
    apiClient.get<ApiEnvelope<BomsListPayload>>(`/boms${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<BomDetail>>(`/boms/${id}`),

  getActiveForProduct: (productId: string) =>
    apiClient.get<ApiEnvelope<BomDetail | null>>(`/boms/by-product/${productId}/active`),

  create: (payload: CreateBomPayload) => apiClient.post<ApiEnvelope<BomDetail>>("/boms", payload),

  update: (id: string, payload: UpdateBomPayload) =>
    apiClient.patch<ApiEnvelope<BomDetail>>(`/boms/${id}`, payload),

  deactivate: (id: string) => apiClient.post<ApiEnvelope<BomDetail>>(`/boms/${id}/deactivate`),
};
