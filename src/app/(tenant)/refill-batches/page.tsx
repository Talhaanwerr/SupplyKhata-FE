"use client";

import { useState } from "react";
import { Droplets, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { RefillBatchesTable } from "@/features/tenant/refill-batches/RefillBatchesTable";

export default function RefillBatchesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { enabled: plantFillEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.PLANT_FILL
  );

  if (flagLoading || !plantFillEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Plant Fill Log"
          description="Track cans filled at the plant and fill cost per batch."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Droplets}
            title={flagLoading ? "Loading…" : "Plant Fill Log is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Plant Fill Log feature."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plant Fill Log"
        description="Track cans filled at the plant and fill cost per batch. Delivery COGS still uses Product Cost History."
        action={
          <PermissionGuard permission={PERMISSIONS.REFILL.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Log Fill
            </Button>
          </PermissionGuard>
        }
      />
      <RefillBatchesTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
