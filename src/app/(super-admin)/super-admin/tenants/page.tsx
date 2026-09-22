import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TenantsTable } from "@/features/super-admin/tenants/TenantsTable";

export const metadata: Metadata = { title: "Tenants" };

export default function TenantsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Manage all platform tenants"
        action={
          <Link href="/super-admin/tenants/create">
            <Button>
              <Plus className="h-4 w-4" />
              New Tenant
            </Button>
          </Link>
        }
      />
      <TenantsTable />
    </div>
  );
}
