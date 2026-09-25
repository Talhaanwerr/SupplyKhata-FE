import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  CashHandover,
  CreateCashHandoverPayload,
  ListCashHandoversParams,
  RiderCashBalance,
  UpdateCashHandoverPayload,
} from "@/types/cash-handovers";

function buildQuery(params?: ListCashHandoversParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.riderId) q.set("riderId", params.riderId);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const cashHandoversApi = {
  list: (params?: ListCashHandoversParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<CashHandover>>>(
      `/cash-handovers${buildQuery(params)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<CashHandover>>(`/cash-handovers/${id}`),

  create: (payload: CreateCashHandoverPayload) =>
    apiClient.post<ApiEnvelope<CashHandover>>("/cash-handovers", payload),

  update: (id: string, payload: UpdateCashHandoverPayload) =>
    apiClient.patch<ApiEnvelope<CashHandover>>(`/cash-handovers/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/cash-handovers/${id}`),

  riderCashBalance: (riderId: string) =>
    apiClient.get<ApiEnvelope<RiderCashBalance>>(`/riders/${riderId}/cash-balance`),
};
