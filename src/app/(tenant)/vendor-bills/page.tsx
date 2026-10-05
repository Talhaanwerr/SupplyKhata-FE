"use client";

import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorBillsTable } from "@/features/tenant/vendor-bills/VendorBillsTable";

export default function VendorBillsPage() {
  const { enabled: billsEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.VENDOR_BILLS
  );
  const { enabled: vendorsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDORS);

  if (flagLoading || !billsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendor Bills" description="Bills, payments, and payables." />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title={flagLoading ? "Loading…" : "Vendor Bills is disabled for this workspace"}
            description="Contact the platform admin to enable Vendor Bills."
          />
        </div>
      </div>
    );
  }

  if (!vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendor Bills" description="Bills, payments, and payables." />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title="Enable Vendors first"
            description="Vendor bills require the Vendors feature."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Bills"
        description="Bills, payments, and payables."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/vendor-bills/dues">Payables due</Link>
            </Button>
            <PermissionGuard permission={PERMISSIONS.VENDOR_BILLS.CREATE}>
              <Button asChild>
                <Link href="/vendor-bills/new">
                  <Plus className="h-4 w-4" />
                  New bill
                </Link>
              </Button>
            </PermissionGuard>
          </div>
        }
      />
      <VendorBillsTable />
    </div>
  );
}
