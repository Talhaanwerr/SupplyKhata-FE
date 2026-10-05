"use client";

import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorPayablesDuesView } from "@/features/tenant/vendor-bills/VendorPayablesDuesView";

export default function VendorPayablesDuesPage() {
  const { enabled: billsEnabled, isLoading } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDOR_BILLS);
  const { enabled: vendorsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDORS);

  if (isLoading || !billsEnabled || !vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payables Due" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title={isLoading ? "Loading…" : "Enable Vendor Bills and Vendors"}
            description="Both flags are required to see payables due."
          />
        </div>
      </div>
    );
  }

  return <VendorPayablesDuesView />;
}
