"use client";

import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { InvoicesTable } from "@/features/tenant/invoices/InvoicesTable";
import { GenerateInvoiceDialog } from "@/features/tenant/invoices/GenerateInvoiceDialog";

export default function InvoicesPage() {
  const { enabled: invoicesEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.INVOICES
  );
  const [generateOpen, setGenerateOpen] = useState(false);

  if (flagLoading || !invoicesEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Invoices"
          description="Customer period statements from deliveries and orders."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileText}
            title={flagLoading ? "Loading…" : "Invoices is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Invoices feature."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Customer period statements from deliveries and orders. Issue does not post ledger."
        action={
          <PermissionGuard permission={PERMISSIONS.INVOICES.CREATE}>
            <Button type="button" onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4" />
              Generate
            </Button>
          </PermissionGuard>
        }
      />
      <InvoicesTable />
      <GenerateInvoiceDialog open={generateOpen} onClose={() => setGenerateOpen(false)} />
    </div>
  );
}
