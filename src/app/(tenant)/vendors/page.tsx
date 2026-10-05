"use client";

import { useState } from "react";
import { Factory, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorsTable } from "@/features/tenant/vendors/VendorsTable";

export default function VendorsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { enabled: vendorsEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.VENDORS
  );

  if (flagLoading || !vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendors" description="Supplier master. Bills and POs come later." />
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Supplier master. Bills and POs come later."
        action={
          <PermissionGuard permission={PERMISSIONS.VENDORS.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          </PermissionGuard>
        }
      />
      <VendorsTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
