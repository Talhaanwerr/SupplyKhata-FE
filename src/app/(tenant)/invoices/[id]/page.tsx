"use client";

import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { InvoiceDetailView } from "@/features/tenant/invoices/InvoiceDetailView";

export default function InvoiceDetailPage() {
  const { enabled: invoicesEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.INVOICES
  );

  if (flagLoading || !invoicesEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" description="Invoice detail" />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={FileText}
            title={flagLoading ? "Loading…" : "Invoices is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Invoices feature."
            }
          />
        </div>
      </div>
    );
  }

  return <InvoiceDetailView />;
}
