import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type { NotificationItem, UnreadCountPayload } from "@/types/notifications";

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<NotificationItem>>>("/notifications", {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  unreadCount: () => apiClient.get<ApiEnvelope<UnreadCountPayload>>("/notifications/unread-count"),

  markAsRead: (id: string) =>
    apiClient.patch<ApiEnvelope<NotificationItem>>(`/notifications/${id}/read`),

  markAllAsRead: () => apiClient.patch<ApiEnvelope<{ updated: number }>>("/notifications/read-all"),
};
