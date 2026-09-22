"use client";

import { PageHeader } from "@/components/ui/page-header";
import { RequirePermission } from "@/components/ui/require-permission";
import { PermissionsMatrix } from "@/features/tenant/permissions/PermissionsMatrix";
import { PERMISSIONS } from "@/constants/permissions";

export default function PermissionsPage() {
  return (
    <RequirePermission
      mode="any"
      permission={[PERMISSIONS.ROLES.READ, PERMISSIONS.ROLES.MANAGE, PERMISSIONS.PERMISSIONS.READ]}
    >
      <div className="space-y-6">
        <PageHeader
          title="Permissions"
          description="View and manage workspace permissions per role"
        />
        <PermissionsMatrix />
      </div>
    </RequirePermission>
  );
}
