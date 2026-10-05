"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PurchaseOrderForm } from "@/features/tenant/purchase-orders/PurchaseOrderForm";

export default function NewPurchaseOrderPage() {
  const { enabled: poEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.PURCHASE_ORDERS
  );
  const { enabled: vendorsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDORS);

  if (flagLoading || !poEnabled || !vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="New purchase order" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={ClipboardList}
            title={
              flagLoading
                ? "Loading…"
                : !poEnabled
                  ? "Purchase Orders is disabled"
                  : "Enable Vendors first"
            }
            description="PO create needs Purchase Orders and Vendors enabled."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/purchase-orders"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Purchase orders
        </Link>
        <PageHeader title="New purchase order" description="Create a draft PO" />
      </div>
      <PurchaseOrderForm />
    </div>
  );
}
