"use client";

import Link from "next/link";
import { ArrowLeft, Factory } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { ProductionOrderCreateForm } from "@/features/tenant/production/ProductionOrderCreateForm";

export default function NewProductionOrderPage() {
  const { enabled: productionEnabled, isLoading } = useFeatureFlag(FEATURE_FLAG_SLUGS.PRODUCTION);

  if (isLoading || !productionEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="New production order" />
        <EmptyState
          icon={Factory}
          title={isLoading ? "Loading…" : "Production disabled"}
          description="Enable Production to create orders."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/production"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Production
        </Link>
        <PageHeader
          title="New production order"
          description="Create a draft against an active BOM."
        />
      </div>
      <ProductionOrderCreateForm />
    </div>
  );
}
