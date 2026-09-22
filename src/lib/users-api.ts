import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type {
  UserListItem,
  UserDetail,
  InviteUserPayload,
  CreateUserPayload,
  UpdateUserPayload,
  AssignUserRolesPayload,
} from "@/types/users";

type UserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

/** All API calls for the /users resource. Unwraps the ApiEnvelope. */
export const usersApi = {
  list: (params?: UserListParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<UserListItem>>>("/users", { params }),

  /** Super Admin: all users across the platform (includes SA accounts). */
  listPlatform: (params?: UserListParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<UserListItem>>>("/users/platform", { params }),

  /** Super Admin: soft-delete a platform user account. */
  deletePlatform: (id: string) => apiClient.delete<ApiEnvelope<null>>(`/users/platform/${id}`),

  getOne: (id: string) => apiClient.get<ApiEnvelope<UserDetail>>(`/users/${id}`),

  invite: (payload: InviteUserPayload) =>
    apiClient.post<ApiEnvelope<UserListItem>>("/users/invite", payload),

  create: (payload: CreateUserPayload) =>
    apiClient.post<ApiEnvelope<UserListItem>>("/users", payload),

  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<ApiEnvelope<UserListItem>>(`/users/${id}`, payload),

  deactivate: (id: string) => apiClient.patch<ApiEnvelope<UserListItem>>(`/users/${id}/deactivate`),

  reactivate: (id: string) => apiClient.patch<ApiEnvelope<UserListItem>>(`/users/${id}/reactivate`),

  assignRoles: (id: string, payload: AssignUserRolesPayload) =>
    apiClient.post<ApiEnvelope<UserListItem>>(`/users/${id}/roles`, payload),

  removeMember: (userId: string) => apiClient.delete<ApiEnvelope<null>>(`/users/${userId}`),

  removeRole: (userId: string, roleId: string) =>
    apiClient.delete<ApiEnvelope<null>>(`/users/${userId}/roles/${roleId}`),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return apiClient.post<ApiEnvelope<UserListItem>>("/users/me/avatar", form);
  },
};
