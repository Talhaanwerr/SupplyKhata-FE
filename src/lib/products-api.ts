import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  Product,
  ProductCost,
  CurrentCostResult,
  CreateProductPayload,
  UpdateProductPayload,
  CreateProductCostPayload,
  ListProductsParams,
} from "@/types/products";

function buildQuery(params?: ListProductsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const productsApi = {
  list: (params?: ListProductsParams) =>
    apiClient.get<ApiEnvelope<Product[]>>(`/products${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<Product>>(`/products/${id}`),

  create: (payload: CreateProductPayload) =>
    apiClient.post<ApiEnvelope<Product>>("/products", payload),

  update: (id: string, payload: UpdateProductPayload) =>
    apiClient.patch<ApiEnvelope<Product>>(`/products/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/products/${id}`),

  listCosts: (id: string) => apiClient.get<ApiEnvelope<ProductCost[]>>(`/products/${id}/costs`),

  addCost: (id: string, payload: CreateProductCostPayload) =>
    apiClient.post<ApiEnvelope<ProductCost>>(`/products/${id}/costs`, payload),

  currentCost: (id: string, date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return apiClient.get<ApiEnvelope<CurrentCostResult>>(`/products/${id}/current-cost${q}`);
  },
};
