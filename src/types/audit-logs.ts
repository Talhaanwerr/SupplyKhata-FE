/** Types mirroring the backend AuditLogsService shapes. */

/** A single audit log entry from GET /audit-logs */
export interface AuditLogItem {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  module: string;
  action: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  /** Nested tenant info (only in super-admin view) */
  tenant?: { id: string; name: string; slug: string } | null;
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  search?: string;
  actorId?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  tenantId?: string;
}
