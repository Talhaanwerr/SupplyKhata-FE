"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TenantUsersTable } from "@/features/tenant/users/TenantUsersTable";
import { InviteUserModal } from "@/features/tenant/users/InviteUserModal";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";

export default function TenantUsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage workspace members and their roles"
        action={
          <PermissionGuard permission={PERMISSIONS.USERS.CREATE}>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" />
              Invite User
            </Button>
          </PermissionGuard>
        }
      />

      <TenantUsersTable />

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
