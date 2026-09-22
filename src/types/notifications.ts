export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCountPayload {
  count: number;
}
