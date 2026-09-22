"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { CustomersTable } from "@/features/tenant/customers/CustomersTable";

export default function CustomersPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customers, areas, and product prices"
        action={
          <PermissionGuard permission={PERMISSIONS.CUSTOMERS.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </PermissionGuard>
        }
      />

      <CustomersTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
