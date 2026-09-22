import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { TenantFeatureFlagsList } from "@/features/tenant/feature-flags/TenantFeatureFlagsList";

export const metadata: Metadata = { title: "Feature Flags" };

export default function TenantFeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags"
        description="Enable or disable optional features for your workspace"
      />
      <TenantFeatureFlagsList />
    </div>
  );
}
