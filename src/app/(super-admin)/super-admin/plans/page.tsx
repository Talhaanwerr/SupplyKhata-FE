import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { PlansTable } from "@/features/super-admin/plans/PlansTable";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Plans" description="Manage subscription plans and pricing" />
      <PlansTable />
    </div>
  );
}
