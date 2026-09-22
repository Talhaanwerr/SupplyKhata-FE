import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Analytics and reporting for your workspace" />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          icon={BarChart3}
          title="Reports — Coming Soon"
          description="This section is a placeholder. Connect your analytics API to render charts and data exports here."
        />
      </div>
    </div>
  );
}
