import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  BalancesListPayload,
  ListBalancesParams,
  ListMovementsParams,
  MovementsListPayload,
  StockLocation,
  StockLocationType,
  StockMovementType,
} from "@/types/inventory";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const inventoryApi = {
  listLocations: (params?: { isActive?: boolean }) =>
    apiClient.get<ApiEnvelope<StockLocation[]>>(
      `/inventory/locations${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  createLocation: (payload: {
    name: string;
    type?: StockLocationType;
    code?: string;
    notes?: string;
  }) => apiClient.post<ApiEnvelope<StockLocation>>("/inventory/locations", payload),

  updateLocation: (
    id: string,
    payload: {
      name?: string;
      type?: StockLocationType;
      code?: string | null;
      notes?: string | null;
      isActive?: boolean;
    }
  ) => apiClient.patch<ApiEnvelope<StockLocation>>(`/inventory/locations/${id}`, payload),

  listBalances: (params?: ListBalancesParams) =>
    apiClient.get<ApiEnvelope<BalancesListPayload>>(
      `/inventory/balances${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  listMovements: (params?: ListMovementsParams) =>
    apiClient.get<ApiEnvelope<MovementsListPayload>>(
      `/inventory/movements${buildQuery(params as Record<string, string | number | boolean | undefined>)}`
    ),

  postOpening: (payload: {
    locationId?: string;
    lines: { productId: string; quantity: number }[];
  }) => apiClient.post<ApiEnvelope<unknown>>("/inventory/opening", payload),

  postAdjustment: (payload: {
    locationId?: string;
    productId: string;
    quantityDelta: number;
    reason: string;
  }) => apiClient.post<ApiEnvelope<unknown>>("/inventory/adjustments", payload),

  postTransfer: (payload: {
    fromLocationId: string;
    toLocationId: string;
    productId: string;
    quantity: number;
  }) => apiClient.post<ApiEnvelope<unknown>>("/inventory/transfers", payload),
};

export type { StockMovementType };
