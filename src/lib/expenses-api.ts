import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CreateExpensePayload,
  Expense,
  ExpensesListPayload,
  ListExpensesParams,
  UpdateExpensePayload,
} from "@/types/expenses";

function buildQuery(params?: ListExpensesParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.search) q.set("search", params.search);
  if (params.staffId) q.set("staffId", params.staffId);
  if (params.vehicleId) q.set("vehicleId", params.vehicleId);
  if (params.isPaidByRider != null) q.set("isPaidByRider", String(params.isPaidByRider));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const expensesApi = {
  list: (params?: ListExpensesParams) =>
    apiClient.get<ApiEnvelope<ExpensesListPayload>>(`/expenses${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<Expense>>(`/expenses/${id}`),

  create: (payload: CreateExpensePayload) =>
    apiClient.post<ApiEnvelope<Expense>>("/expenses", payload),

  update: (id: string, payload: UpdateExpensePayload) =>
    apiClient.patch<ApiEnvelope<Expense>>(`/expenses/${id}`, payload),

  remove: (id: string) => apiClient.delete<void>(`/expenses/${id}`),
};
