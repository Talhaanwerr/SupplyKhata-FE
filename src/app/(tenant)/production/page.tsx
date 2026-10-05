"use client";

import Link from "next/link";
import { Factory, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { ProductionOrdersTable } from "@/features/tenant/production/ProductionOrdersTable";

export default function ProductionPage() {
  const { enabled: productionEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.PRODUCTION
  );
  const { enabled: inventoryEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.INVENTORY);
  const { enabled: rawEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RAW_MATERIALS);

  if (flagLoading || !productionEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Production" description="Produce finished goods from BOM recipes." />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Factory}
            title={flagLoading ? "Loading…" : "Production is disabled for this workspace"}
            description="Enable the Production flag to manage production orders."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production"
        description="Draft → plan → start → complete (raw consume + finished IN)."
        action={
          <PermissionGuard permission={PERMISSIONS.PRODUCTION.CREATE}>
            <Button asChild>
              <Link href="/production/new">
                <Plus className="h-4 w-4" />
                New order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      {(!inventoryEnabled || !rawEnabled) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Enable <strong>Inventory</strong> and <strong>Raw Materials</strong> before completing
          orders (stock posts). You can still draft / plan / start with Production on.
        </div>
      )}

      <ProductionOrdersTable />
    </div>
  );
}
