import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SuperAdminUsersTable } from "@/features/super-admin/users/SuperAdminUsersTable";

export const metadata: Metadata = { title: "Users" };

export default function SuperAdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="All users across the platform" />
      <SuperAdminUsersTable />
    </div>
  );
}
