import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogsTable } from "@/features/super-admin/audit-logs/AuditLogsTable";

export const metadata: Metadata = { title: "Audit Logs" };

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Platform-wide activity trail" />
      <AuditLogsTable />
    </div>
  );
}
