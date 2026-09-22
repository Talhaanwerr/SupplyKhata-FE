import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SuperAdminSettingsForm } from "@/features/super-admin/settings/SuperAdminSettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform-level configuration" />
      <SuperAdminSettingsForm />
    </div>
  );
}
