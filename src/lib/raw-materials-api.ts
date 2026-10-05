import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CreateRawMaterialCostPayload,
  CreateRawMaterialPayload,
  ListRawBalancesParams,
  ListRawMaterialsParams,
  ListRawMovementsParams,
  RawBalancesListPayload,
  RawMaterial,
  RawMaterialCost,
  RawMaterialDetail,
  RawMaterialsListPayload,
  RawMovementsListPayload,
  UpdateRawMaterialPayload,
} from "@/types/raw-materials";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const rawMaterialsApi = {
  list: (params?: ListRawMaterialsParams) =>
    apiClient.get<ApiEnvelope<RawMaterialsListPayload>>(
      `/raw-materials${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<RawMaterialDetail>>(`/raw-materials/${id}`),

  create: (payload: CreateRawMaterialPayload) =>
    apiClient.post<ApiEnvelope<RawMaterial>>("/raw-materials", payload),

  update: (id: string, payload: UpdateRawMaterialPayload) =>
    apiClient.patch<ApiEnvelope<RawMaterial>>(`/raw-materials/${id}`, payload),

  listCosts: (id: string) =>
    apiClient.get<ApiEnvelope<RawMaterialCost[]>>(`/raw-materials/${id}/costs`),

  addCost: (id: string, payload: CreateRawMaterialCostPayload) =>
    apiClient.post<ApiEnvelope<RawMaterialCost>>(`/raw-materials/${id}/costs`, payload),

  listBalances: (params?: ListRawBalancesParams) =>
    apiClient.get<ApiEnvelope<RawBalancesListPayload>>(
      `/raw-materials/balances${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  listMovements: (params?: ListRawMovementsParams) =>
    apiClient.get<ApiEnvelope<RawMovementsListPayload>>(
      `/raw-materials/movements${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  postOpening: (payload: {
    locationId?: string;
    lines: { rawMaterialId: string; quantity: number }[];
  }) => apiClient.post<ApiEnvelope<unknown>>("/raw-materials/opening", payload),

  postAdjustment: (payload: {
    locationId?: string;
    rawMaterialId: string;
    quantityDelta: number;
    reason: string;
  }) => apiClient.post<ApiEnvelope<unknown>>("/raw-materials/adjustments", payload),
};
