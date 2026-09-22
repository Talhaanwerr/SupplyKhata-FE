"use client";

import { useRef } from "react";
// import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
// import { Button } from "@/components/ui/button";
import { RolesTable } from "@/features/tenant/roles/RolesTable";
// import { PermissionGuard } from "@/components/ui/permission-guard";
// import { PERMISSIONS } from "@/constants/permissions";

export default function RolesPage() {
  const openCreateRef = useRef<(() => void) | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="View seeded roles and what each role can access. Custom roles are disabled for now."
        // Custom "New Role" hidden for now — uncomment imports + action below to re-enable.
        // action={
        //   <PermissionGuard permission={PERMISSIONS.ROLES.CREATE}>
        //     <Button onClick={() => openCreateRef.current?.()}>
        //       <Plus className="h-4 w-4" />
        //       New Role
        //     </Button>
        //   </PermissionGuard>
        // }
      />
      <RolesTable
        onCreateRef={(fn) => {
          openCreateRef.current = fn;
        }}
      />
    </div>
  );
}
