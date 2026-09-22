"use client";

import { PageHeader } from "@/components/ui/page-header";
import { RequirePermission } from "@/components/ui/require-permission";
import { ActivityLogsTable } from "@/features/tenant/activity-logs/ActivityLogsTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function ActivityLogsPage() {
  return (
    <RequirePermission
      mode="any"
      permission={[PERMISSIONS.AUDIT_LOGS.READ, PERMISSIONS.AUDIT_LOGS.MANAGE]}
    >
      <div className="space-y-6">
        <PageHeader title="Activity Logs" description="Audit trail for your workspace" />
        <ActivityLogsTable />
      </div>
    </RequirePermission>
  );
}
