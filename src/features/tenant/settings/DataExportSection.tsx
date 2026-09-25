"use client";

import { useState } from "react";
import { Download, Loader2, Users, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGuardAny } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/constants/permissions";
import { exportApi } from "@/lib/export-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { canAccess } from "@/lib/can-access";
import { useAuthStore } from "@/store/auth-store";

type ExportBusy = "all" | "users" | "audit-logs" | null;

/**
 * Settings → Data Export
 * Downloads workspace users / activity logs as CSV via authenticated API calls.
 */
export function DataExportSection() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [busy, setBusy] = useState<ExportBusy>(null);

  const canUsers = canAccess(user, PERMISSIONS.USERS.READ);
  const canAudit = canAccess(user, PERMISSIONS.AUDIT_LOGS.READ);

  async function run(kind: ExportBusy, action: () => Promise<void>, successTitle: string) {
    if (!kind) return;
    setBusy(kind);
    try {
      await action();
      toast({ title: successTitle, variant: "success" });
    } catch (err) {
      toast({
        title: "Export failed",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function exportAll() {
    setBusy("all");
    try {
      if (canUsers) await exportApi.downloadUsersCsv();
      if (canAudit) await exportApi.downloadAuditLogsCsv();
      toast({
        title: "Export ready",
        description: "Your CSV download(s) should start shortly.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <PermissionGuardAny permissions={[PERMISSIONS.USERS.READ, PERMISSIONS.AUDIT_LOGS.READ]}>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Data Export</h2>
        <p className="mb-5 text-sm text-slate-500">
          Download your workspace data as CSV. Files include members and activity history you are
          allowed to access.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {(canUsers || canAudit) && (
            <Button type="button" onClick={() => void exportAll()} disabled={busy !== null}>
              {busy === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export all data (CSV)
            </Button>
          )}

          {canUsers && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void run("users", () => exportApi.downloadUsersCsv(), "Users CSV downloaded")
              }
              disabled={busy !== null}
            >
              {busy === "users" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Export users
            </Button>
          )}

          {canAudit && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void run(
                  "audit-logs",
                  () => exportApi.downloadAuditLogsCsv(),
                  "Activity logs CSV downloaded"
                )
              }
              disabled={busy !== null}
            >
              {busy === "audit-logs" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScrollText className="h-4 w-4" />
              )}
              Export activity logs
            </Button>
          )}
        </div>
      </div>
    </PermissionGuardAny>
  );
}
