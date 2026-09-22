"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { VehiclesTable } from "@/features/tenant/vehicles/VehiclesTable";

export default function VehiclesPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Loaders and delivery vehicles"
        action={
          <PermissionGuard permission={PERMISSIONS.VEHICLES.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </PermissionGuard>
        }
      />
      <VehiclesTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
