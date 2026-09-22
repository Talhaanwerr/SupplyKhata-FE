import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/features/tenant/profile/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Update your personal information and password" />
      <ProfileForm />
    </div>
  );
}
