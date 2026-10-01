"use client";

import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { OrdersTable } from "@/features/tenant/orders/OrdersTable";

export default function OrdersPage() {
  const { enabled: ordersEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.ORDERS
  );

  if (flagLoading || !ordersEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Orders"
          description="Customer orders and fulfillment (separate from delivery runs)."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={ShoppingCart}
            title={flagLoading ? "Loading…" : "Orders is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Orders feature."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Customer orders and fulfillment (separate from delivery runs)."
        action={
          <PermissionGuard permission={PERMISSIONS.ORDERS.CREATE}>
            <Button asChild>
              <Link href="/orders/new">
                <Plus className="h-4 w-4" />
                New order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <OrdersTable />
    </div>
  );
}
