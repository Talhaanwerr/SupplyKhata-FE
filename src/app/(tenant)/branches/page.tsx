import type { Metadata } from "next";
import { GitBranch } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Branches" };

export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Branches" description="Manage your organization's branches or locations" />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          icon={GitBranch}
          title="Branches — Coming Soon"
          description="Branch management will be available in a future release. This placeholder is ready to be wired to the API."
        />
      </div>
    </div>
  );
}
