"use client";

import { useState } from "react";
import { Layers, Plus, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { useQueryClient } from "@tanstack/react-query";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { RAW_MATERIALS_QUERY_KEY } from "@/constants/query-keys";
import { RawMaterialsTable } from "@/features/tenant/raw-materials/RawMaterialsTable";
import { RawOpeningStockModal } from "@/features/tenant/raw-materials/RawOpeningStockModal";
import { RawAdjustStockModal } from "@/features/tenant/raw-materials/RawAdjustStockModal";

export default function RawMaterialsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const qc = useQueryClient();
  const { enabled: rawEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.RAW_MATERIALS
  );
  const { enabled: warehouseEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.WAREHOUSE);

  if (flagLoading || !rawEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Raw Materials"
          description="Ingredients and packaging stock (separate from finished products)."
        />
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [RAW_MATERIALS_QUERY_KEY] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Materials"
        description="Ingredients and packaging stock (separate from finished products)."
        action={
          <div className="flex flex-wrap gap-2">
            <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.CREATE}>
              <Button variant="outline" onClick={() => setOpeningOpen(true)}>
                <Plus className="h-4 w-4" />
                Opening
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.ADJUST}>
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                Adjust
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.CREATE}>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Material
              </Button>
            </PermissionGuard>
          </div>
        }
      />
      <RawMaterialsTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
      <RawOpeningStockModal
        open={openingOpen}
        onClose={() => setOpeningOpen(false)}
        warehouseEnabled={warehouseEnabled}
        onSuccess={invalidate}
      />
      <RawAdjustStockModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        warehouseEnabled={warehouseEnabled}
        onSuccess={invalidate}
      />
    </div>
  );
}
