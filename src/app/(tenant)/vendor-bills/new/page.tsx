"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorBillCreateForm } from "@/features/tenant/vendor-bills/VendorBillCreateForm";

export default function NewVendorBillPage() {
  const { enabled: billsEnabled, isLoading } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDOR_BILLS);
  const { enabled: vendorsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDORS);

  if (isLoading || !billsEnabled || !vendorsEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="New vendor bill" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title={isLoading ? "Loading…" : "Enable Vendor Bills and Vendors"}
            description="Both flags are required to create bills."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vendor-bills"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Vendor bills
        </Link>
        <PageHeader
          title="New vendor bill"
          description="Link a goods receipt to bill received qty × PO cost, or enter lines manually."
        />
      </div>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading form…</p>}>
        <VendorBillCreateForm />
      </Suspense>
    </div>
  );
}
