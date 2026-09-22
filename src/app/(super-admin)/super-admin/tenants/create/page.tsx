import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTenantForm } from "@/features/super-admin/tenants/CreateTenantForm";

export const metadata: Metadata = { title: "Create Tenant" };

export default function CreateTenantPage() {
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
      <PageHeader title="Create Tenant" description="Add a new tenant to the platform" />
      <CreateTenantForm />
    </div>
  );
}
