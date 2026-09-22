"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { ProductsTable } from "@/features/tenant/products/ProductsTable";

export default function ProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage products, prices, and costs"
        action={
          <PermissionGuard permission={PERMISSIONS.PRODUCTS.CREATE}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </PermissionGuard>
        }
      />

      <ProductsTable createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
    </div>
  );
}
