import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TenantDetailView } from "@/features/super-admin/tenants/TenantDetailView";

export const metadata: Metadata = { title: "Tenant Detail" };

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>
      <PageHeader
        title="Tenant Detail"
        description={`ID: ${id}`}
        action={
          <Link href={`/super-admin/tenants/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        }
      />
      <TenantDetailView tenantId={id} />
    </div>
  );
}
