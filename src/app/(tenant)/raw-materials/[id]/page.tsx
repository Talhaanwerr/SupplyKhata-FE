"use client";

import { Layers } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { RawMaterialDetailView } from "@/features/tenant/raw-materials/RawMaterialDetailView";

export default function RawMaterialDetailPage() {
  const { enabled: rawEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.RAW_MATERIALS
  );

  if (flagLoading || !rawEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Raw Material" description="Material details and stock" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Layers}
            title={flagLoading ? "Loading…" : "Raw Materials is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Raw Materials feature."
            }
          />
        </div>
      </div>
    );
  }

  return <RawMaterialDetailView />;
}
