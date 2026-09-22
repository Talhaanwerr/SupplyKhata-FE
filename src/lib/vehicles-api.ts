import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  Vehicle,
  CreateVehiclePayload,
  UpdateVehiclePayload,
  ListVehiclesParams,
} from "@/types/vehicles";

function buildQuery(params?: ListVehiclesParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const vehiclesApi = {
  list: (params?: ListVehiclesParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<Vehicle>>>(`/vehicles${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<Vehicle>>(`/vehicles/${id}`),

  create: (payload: CreateVehiclePayload) =>
    apiClient.post<ApiEnvelope<Vehicle>>("/vehicles", payload),

  update: (id: string, payload: UpdateVehiclePayload) =>
    apiClient.patch<ApiEnvelope<Vehicle>>(`/vehicles/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/vehicles/${id}`),
};
