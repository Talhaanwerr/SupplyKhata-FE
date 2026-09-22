"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Truck } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { VEHICLES_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { VehicleFormModal } from "./VehicleFormModal";
import type { Vehicle } from "@/types/vehicles";

interface VehiclesTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function VehiclesTable({ createOpen, onCreateClose }: VehiclesTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [toggleVehicle, setToggleVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, page, search, status, pageSize],
    queryFn: () =>
      vehiclesApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        status: status === "ACTIVE" || status === "INACTIVE" ? status : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const vehicles = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const toggleStatus = useApiMutation(
    (row: Vehicle) =>
      vehiclesApi.update(row.id, {
        status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
        setToggleVehicle(null);
        toast({ title: "Vehicle status updated", variant: "success" });
      },
      onError: (err) => {
        toast({
          title: "Could not update status",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
        setToggleVehicle(null);
      },
    }
  );

  const remove = useApiMutation((id: string) => vehiclesApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
      setDeleteVehicle(null);
      toast({ title: "Vehicle deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete vehicle",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteVehicle(null);
    },
  });

  const columns: Column<Vehicle>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      key: "plateNumber",
      header: "Plate",
      render: (row) => <span className="text-slate-600">{row.plateNumber || "—"}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="text-slate-600">{row.type || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard permission={PERMISSIONS.VEHICLES.UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit vehicle"
              onClick={() => setEditVehicle(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle status"
              onClick={() => setToggleVehicle(row)}
            >
              <Truck
                className={`h-4 w-4 ${
                  row.status === "ACTIVE" ? "text-amber-600" : "text-green-600"
                }`}
              />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.VEHICLES.DELETE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete vehicle"
              onClick={() => setDeleteVehicle(row)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name, plate, type…"
          className="sm:max-w-xs"
        />
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No vehicles yet"
            description="Add your first loader or delivery vehicle."
          />
        }
      />

      <VehicleFormModal open={createOpen} onClose={onCreateClose} />
      <VehicleFormModal
        open={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        vehicle={editVehicle}
      />

      <ConfirmDialog
        open={!!toggleVehicle}
        onClose={() => setToggleVehicle(null)}
        onConfirm={() => {
          if (toggleVehicle) toggleStatus.mutate(toggleVehicle);
        }}
        title={toggleVehicle?.status === "ACTIVE" ? "Deactivate Vehicle" : "Activate Vehicle"}
        description={
          toggleVehicle
            ? `${toggleVehicle.status === "ACTIVE" ? "Deactivate" : "Activate"} "${toggleVehicle.name}"?`
            : ""
        }
        confirmLabel={toggleVehicle?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        isLoading={toggleStatus.isPending}
      />

      <ConfirmDialog
        open={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        onConfirm={() => {
          if (deleteVehicle) remove.mutate(deleteVehicle.id);
        }}
        title="Delete Vehicle"
        description={
          deleteVehicle
            ? `Delete "${deleteVehicle.name}"? You can create it again later with the same name.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </>
  );
}
