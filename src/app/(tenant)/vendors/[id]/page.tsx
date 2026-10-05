"use client";

import { Factory } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorDetailView } from "@/features/tenant/vendors/VendorDetailView";

export default function VendorDetailPage() {
  const { enabled: vendorsEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.VENDORS
  );

  if (flagLoading || !vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendor" description="Supplier details" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Factory}
            title={flagLoading ? "Loading…" : "Vendors is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Vendors feature."
            }
          />
        </div>
      </div>
    );
  }

  return <VendorDetailView />;
}
