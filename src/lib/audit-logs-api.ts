import { apiClient } from "./api-client";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";
import type { AuditLogItem, ListAuditLogsParams } from "@/types/audit-logs";

/**
 * All API calls for the /audit-logs resource.
 * Super admins see all tenant logs; tenant admins see only their own tenant.
 */
export const auditLogsApi = {
  list: (params?: ListAuditLogsParams) =>
    apiClient.get<ApiEnvelope<PaginatedPayload<AuditLogItem>>>("/audit-logs", {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),
};
