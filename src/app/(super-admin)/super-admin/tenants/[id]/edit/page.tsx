import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EditTenantForm } from "@/features/super-admin/tenants/EditTenantForm";

export const metadata: Metadata = { title: "Edit Tenant" };

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/super-admin/tenants/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>
      <PageHeader title="Edit Tenant" description="Update tenant information" />
      <EditTenantForm tenantId={id} />
    </div>
  );
}
