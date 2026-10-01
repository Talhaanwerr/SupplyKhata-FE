"use client";

import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { OrderDetailView } from "@/features/tenant/orders/OrderDetailView";

export default function OrderDetailPage() {
  const { enabled: ordersEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.ORDERS
  );

  if (flagLoading || !ordersEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order" description="Order detail and fulfillment." />
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

  return <OrderDetailView />;
}
