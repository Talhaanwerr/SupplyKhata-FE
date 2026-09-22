import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type { Area, CreateAreaPayload, UpdateAreaPayload, ListAreasParams } from "@/types/areas";

function buildQuery(params?: ListAreasParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.includeInactive) q.set("includeInactive", "true");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const areasApi = {
  list: (params?: ListAreasParams) =>
    apiClient.get<ApiEnvelope<Area[]>>(`/areas${buildQuery(params)}`),

  create: (payload: CreateAreaPayload) => apiClient.post<ApiEnvelope<Area>>("/areas", payload),

  update: (id: string, payload: UpdateAreaPayload) =>
    apiClient.patch<ApiEnvelope<Area>>(`/areas/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/areas/${id}`),
};
