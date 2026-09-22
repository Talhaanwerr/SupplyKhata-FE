import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  CreatePaymentPayload,
  ListPaymentsParams,
  PaymentDashboard,
  PaymentDetail,
  PaymentListItem,
  UpdatePaymentPayload,
} from "@/types/payments";

function buildQuery(params?: ListPaymentsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.method) q.set("method", params.method);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const paymentsApi = {
  list: (params?: ListPaymentsParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<PaymentListItem>>>(`/payments${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<PaymentDetail>>(`/payments/${id}`),

  dashboard: () => apiClient.get<ApiEnvelope<PaymentDashboard>>("/payments/dashboard"),

  create: (payload: CreatePaymentPayload) =>
    apiClient.post<ApiEnvelope<PaymentDetail>>("/payments", payload),

  update: (id: string, payload: UpdatePaymentPayload) =>
    apiClient.patch<ApiEnvelope<PaymentDetail>>(`/payments/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/payments/${id}`),
};
