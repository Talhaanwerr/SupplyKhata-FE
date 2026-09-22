import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";

export interface StaffMember {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  avatarUrl: string | null;
  roles: Array<{ id: string; name: string; slug: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ListStaffParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

function buildQuery(params?: ListStaffParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.role) q.set("role", params.role);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const staffApi = {
  list: (params?: ListStaffParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<StaffMember>>>(`/staff${buildQuery(params)}`),
};
