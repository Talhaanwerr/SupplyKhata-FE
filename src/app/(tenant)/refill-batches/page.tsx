"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { RefillBatchesTable } from "@/features/tenant/refill-batches/RefillBatchesTable";

export default function RefillBatchesPage() {
  const [createOpen, setCreateOpen] = useState(false);

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
