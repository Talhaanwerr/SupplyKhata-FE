"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PERMISSIONS } from "@/constants/permissions";
import { INVENTORY_QUERY_KEY } from "@/constants/query-keys";
import { inventoryApi } from "@/lib/inventory-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import type { StockLocation, StockLocationType } from "@/types/inventory";

const LOCATION_TYPES: StockLocationType[] = ["WAREHOUSE", "PLANT", "STORE"];

export function InventoryLocationsView() {
  const { enabled: inventoryEnabled, isLoading: invLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.INVENTORY
  );
  const { enabled: warehouseEnabled, isLoading: whLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.WAREHOUSE
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<StockLocationType>("WAREHOUSE");
  const { toast } = useToast();
  const qc = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations"],
    queryFn: () => inventoryApi.listLocations(),
    enabled: !!inventoryEnabled && !!warehouseEnabled,
  });

  const createMutation = useApiMutation(
    (_: void) => inventoryApi.createLocation({ name: name.trim(), type }),
    {
      onSuccess: () => {
        toast({ title: "Location created", variant: "success" });
        void qc.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
        setCreateOpen(false);
        setName("");
        setType("WAREHOUSE");
      },
      onError: (err) =>
        toast({
          title: "Could not create location",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  const columns: Column<StockLocation>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className={r.isActive ? "text-emerald-700" : "text-slate-400"}>
          {r.isActive ? "Active" : "Inactive"}
          {r.isDefault ? " · Default" : ""}
        </span>
      ),
    },
  ];

  if (invLoading || whLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Locations" description="Stock locations" />
        <EmptyState icon={MapPin} title="Loading…" description="Checking feature access…" />
      </div>
    );
  }

  if (!inventoryEnabled || !warehouseEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Locations"
          description="Multi-location stock"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={MapPin}
            title="Enable Warehouse"
            description={
              !inventoryEnabled
                ? "Inventory must be enabled first."
                : "Turn on the Warehouse feature flag for multiple locations and transfers."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Warehouses, plants, and stores for finished-goods stock."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <PermissionGuard permission={PERMISSIONS.INVENTORY.CREATE}>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add location
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={locationsQuery.data?.data ?? []}
        isLoading={locationsQuery.isLoading}
        emptyState={
          <EmptyState icon={MapPin} title="No locations" description="Add a stock location." />
        }
      />

      <Dialog open={createOpen} onOpenChange={(v) => !v && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plant A" />
            </FormField>
            <FormField label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value as StockLocationType)}>
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
