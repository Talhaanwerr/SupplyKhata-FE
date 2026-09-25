"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { ExpensesTable } from "@/features/tenant/expenses/ExpensesTable";

export default function ExpensesPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Workspace expenses with flexible titles."
        action={
          <PermissionGuard permission={PERMISSIONS.EXPENSES.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </PermissionGuard>
        }
      />
      <ExpensesTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
