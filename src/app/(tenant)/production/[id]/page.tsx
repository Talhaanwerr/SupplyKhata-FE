"use client";

import { Factory } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { ProductionOrderDetailView } from "@/features/tenant/production/ProductionOrderDetailView";

export default function ProductionOrderDetailPage() {
  const { enabled: productionEnabled, isLoading } = useFeatureFlag(FEATURE_FLAG_SLUGS.PRODUCTION);

  if (isLoading || !productionEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Production order" />
        <EmptyState
          icon={Factory}
          title={isLoading ? "Loading…" : "Production disabled"}
          description="Enable Production to view orders."
        />
      </div>
    );
  }

  return <ProductionOrderDetailView />;
}
