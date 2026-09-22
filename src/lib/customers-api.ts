import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  CustomerDetail,
  CustomerListItem,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  ListCustomersParams,
} from "@/types/customers";
import type {
  CustomerBalance,
  CustomerLedgerPage,
  CustomerStatement,
  ListLedgerParams,
} from "@/types/payments";

function buildQuery(params?: ListCustomersParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.areaId) q.set("areaId", params.areaId);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const customersApi = {
  list: (params?: ListCustomersParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<CustomerListItem>>>(
      `/customers${buildQuery(params)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<CustomerDetail>>(`/customers/${id}`),

  create: (payload: CreateCustomerPayload) =>
    apiClient.post<ApiEnvelope<CustomerDetail>>("/customers", payload),

  update: (id: string, payload: UpdateCustomerPayload) =>
    apiClient.patch<ApiEnvelope<CustomerDetail>>(`/customers/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/customers/${id}`),

  ledger: (id: string, params?: ListLedgerParams) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const s = q.toString();
    return apiClient.get<ApiEnvelope<CustomerLedgerPage>>(
      `/customers/${id}/ledger${s ? `?${s}` : ""}`
    );
  },

  balance: (id: string) => apiClient.get<ApiEnvelope<CustomerBalance>>(`/customers/${id}/balance`),

  statement: (id: string, params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const s = q.toString();
    return apiClient.get<ApiEnvelope<CustomerStatement>>(
      `/customers/${id}/statement${s ? `?${s}` : ""}`
    );
  },

  price: (id: string, productId: string) =>
    apiClient.get<
      ApiEnvelope<{
        customerId: string;
        productId: string;
        productName: string;
        pricePerUnit: number;
        source: "CUSTOMER" | "PRODUCT_DEFAULT";
      }>
    >(`/customers/${id}/price?productId=${encodeURIComponent(productId)}`),
};
