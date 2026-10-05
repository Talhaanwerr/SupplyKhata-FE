import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CreateVendorPayload,
  ListVendorsParams,
  UpdateVendorPayload,
  Vendor,
  VendorDetail,
  VendorsListPayload,
} from "@/types/vendors";

function buildQuery(params?: ListVendorsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.isActive != null) q.set("isActive", String(params.isActive));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const vendorsApi = {
  list: (params?: ListVendorsParams) =>
    apiClient.get<ApiEnvelope<VendorsListPayload>>(`/vendors${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<VendorDetail>>(`/vendors/${id}`),

  create: (payload: CreateVendorPayload) =>
    apiClient.post<ApiEnvelope<Vendor>>("/vendors", payload),

  update: (id: string, payload: UpdateVendorPayload) =>
    apiClient.patch<ApiEnvelope<Vendor>>(`/vendors/${id}`, payload),
};
