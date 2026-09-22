import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Subscription and payment management" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Current Plan", value: "—" },
          { label: "Next Billing Date", value: "—" },
          { label: "Amount Due", value: "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          icon={CreditCard}
          title="Billing — Coming Soon"
          description="Invoice history and plan management will be wired to the subscriptions API in a future prompt."
        />
      </div>
    </div>
  );
}
