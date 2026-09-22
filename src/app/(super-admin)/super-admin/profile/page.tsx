import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SuperAdminProfileForm } from "@/features/super-admin/profile/SuperAdminProfileForm";

export const metadata: Metadata = { title: "My Profile" };

export default function SuperAdminProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Update your personal information and security settings"
      />
      <SuperAdminProfileForm />
    </div>
  );
}
