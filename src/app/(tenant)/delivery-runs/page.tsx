import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { DeliveryRunsTable } from "@/features/tenant/delivery-runs/DeliveryRunsTable";

export default function DeliveryRunsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Runs"
        description="Open, track, and close rider delivery runs"
        action={
          <PermissionGuard permission={PERMISSIONS.DELIVERY_RUNS.CREATE}>
            <Button asChild>
              <Link href="/delivery-runs/new">
                <Plus className="h-4 w-4" />
                New Run
              </Link>
            </Button>
          </PermissionGuard>
        }
      />
      <DeliveryRunsTable />
    </div>
  );
}
