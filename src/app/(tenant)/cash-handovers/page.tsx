"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { CashHandoversTable } from "@/features/tenant/cash-handovers/CashHandoversTable";

export default function CashHandoversPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Handovers"
        description="Track rider cash handed to the office. Select a rider to see their cash balance."
        action={
          <PermissionGuard permission={PERMISSIONS.HANDOVERS.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Handover
            </Button>
          </PermissionGuard>
        }
      />
      <CashHandoversTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
