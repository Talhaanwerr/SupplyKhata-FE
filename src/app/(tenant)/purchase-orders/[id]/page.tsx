"use client";

import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PurchaseOrderDetailView } from "@/features/tenant/purchase-orders/PurchaseOrderDetailView";

export default function PurchaseOrderDetailPage() {
  const { enabled: poEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.PURCHASE_ORDERS
  );

  if (flagLoading || !poEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase order" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={ClipboardList}
            title={flagLoading ? "Loading…" : "Purchase Orders is disabled"}
            description="Contact the platform admin to enable Purchase Orders."
          />
        </div>
      </div>
    );
  }

  return <PurchaseOrderDetailView />;
}
