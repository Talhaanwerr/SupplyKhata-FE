import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { TenantSettingsForm } from "@/features/tenant/settings/TenantSettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function TenantSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your workspace preferences" />
      <TenantSettingsForm />
    </div>
  );
}
