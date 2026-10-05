"use client";

import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PurchaseOrdersTable } from "@/features/tenant/purchase-orders/PurchaseOrdersTable";

export default function PurchaseOrdersPage() {
  const { enabled: poEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.PURCHASE_ORDERS
  );
  const { enabled: vendorsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDORS);

  if (flagLoading || !poEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase Orders" description="Buy finished goods or raw materials." />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={ClipboardList}
            title={flagLoading ? "Loading…" : "Purchase Orders is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable Purchase Orders."
            }
          />
        </div>
      </div>
    );
  }

  if (!vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase Orders" description="Buy finished goods or raw materials." />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={ClipboardList}
            title="Enable Vendors first"
            description="Purchase orders require the Vendors feature for this workspace."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Buy finished goods or raw materials."
        action={
          <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS.CREATE}>
            <Button asChild>
              <Link href="/purchase-orders/new">
                <Plus className="h-4 w-4" />
                New PO
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <PurchaseOrdersTable />
    </div>
  );
}
