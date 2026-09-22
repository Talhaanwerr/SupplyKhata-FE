import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SubscriptionsTable } from "@/features/super-admin/subscriptions/SubscriptionsTable";

export const metadata: Metadata = { title: "Subscriptions" };

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="All active and past tenant subscriptions" />
      <SubscriptionsTable />
    </div>
  );
}
