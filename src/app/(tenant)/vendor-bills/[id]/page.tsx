"use client";

import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorBillDetailView } from "@/features/tenant/vendor-bills/VendorBillDetailView";

export default function VendorBillDetailPage() {
  const { enabled: billsEnabled, isLoading } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDOR_BILLS);

  if (isLoading || !billsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendor bill" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title={isLoading ? "Loading…" : "Vendor Bills is disabled"}
            description="Contact the platform admin to enable Vendor Bills."
          />
        </div>
      </div>
    );
  }

  return <VendorBillDetailView />;
}
