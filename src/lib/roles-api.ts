import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  RoleItem,
  PermissionItem,
  CreateRolePayload,
  AssignPermissionsPayload,
} from "@/types/roles";

type ListRolesParams = {
  page?: number;
  limit?: number;
  search?: string;
};

/** All API calls for the /roles resource. */
export const rolesApi = {
  list: (params?: ListRolesParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<RoleItem>>>("/roles", {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getOne: (id: string) => apiClient.get<ApiEnvelope<RoleItem>>(`/roles/${id}`),

  listPermissions: () => apiClient.get<ApiEnvelope<PermissionItem[]>>("/roles/permissions/list"),

  create: (payload: CreateRolePayload) => apiClient.post<ApiEnvelope<RoleItem>>("/roles", payload),

  update: (id: string, payload: CreateRolePayload) =>
    apiClient.patch<ApiEnvelope<RoleItem>>(`/roles/${id}`, payload),

  delete: (id: string) => apiClient.delete<ApiEnvelope<null>>(`/roles/${id}`),

  assignPermissions: (roleId: string, payload: AssignPermissionsPayload) =>
    apiClient.post<ApiEnvelope<RoleItem>>(`/roles/${roleId}/permissions`, payload),

  getUserRoles: (userId: string) =>
    apiClient.get<ApiEnvelope<RoleItem[]>>(`/roles/users/${userId}/roles`),

  assignRoleToUser: (userId: string, roleId: string) =>
    apiClient.post<ApiEnvelope<null>>(`/roles/users/${userId}/roles`, { roleId }),

  removeRoleFromUser: (userId: string, roleId: string) =>
    apiClient.delete<ApiEnvelope<null>>(`/roles/users/${userId}/roles/${roleId}`),
};
