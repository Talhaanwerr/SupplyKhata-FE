"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, SlidersHorizontal, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  RAW_MATERIAL_COSTS_QUERY_KEY,
  RAW_MATERIAL_DETAIL_QUERY_KEY,
  RAW_MATERIALS_QUERY_KEY,
} from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { RawMaterialCost } from "@/types/raw-materials";
import { RawMaterialFormModal } from "./RawMaterialFormModal";
import { RawOpeningStockModal } from "./RawOpeningStockModal";
import { RawAdjustStockModal } from "./RawAdjustStockModal";
import { UpdateRawMaterialCostModal } from "./UpdateRawMaterialCostModal";

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function RawMaterialDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: warehouseEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.WAREHOUSE);

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [RAW_MATERIAL_DETAIL_QUERY_KEY, id],
    queryFn: () => rawMaterialsApi.get(id),
    enabled: !!id,
  });

  const { data: movementsRes } = useQuery({
    queryKey: [RAW_MATERIALS_QUERY_KEY, "movements", id],
    queryFn: () => rawMaterialsApi.listMovements({ rawMaterialId: id, limit: 20 }),
    enabled: !!id,
  });

  const { data: costsRes, isLoading: costsLoading } = useQuery({
    queryKey: [RAW_MATERIAL_COSTS_QUERY_KEY, id],
    queryFn: () => rawMaterialsApi.listCosts(id),
    enabled: !!id,
  });

  const material = res?.data;
  const isActive = material?.isActive === true;
  const movements = movementsRes?.data?.items ?? [];
  const costs = costsRes?.data ?? [];

  const costColumns: Column<RawMaterialCost>[] = [
    {
      key: "effectiveFrom",
      header: "Effective From",
      render: (row) => {
        const d = new Date(row.effectiveFrom);
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      },
    },
    {
      key: "costPerUnit",
      header: "Cost / Unit",
      render: (row) => formatMoney(row.costPerUnit),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => row.notes || "—",
    },
  ];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [RAW_MATERIALS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [RAW_MATERIAL_DETAIL_QUERY_KEY, id] });
  };

  const toggleStatus = useApiMutation(() => rawMaterialsApi.update(id, { isActive: !isActive }), {
    onSuccess: () => {
      invalidate();
      setToggleOpen(false);
      toast({
        title: isActive ? "Raw material deactivated" : "Raw material activated",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: isActive ? "Could not deactivate" : "Could not activate",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading raw material…</div>;
  }

  if (isError || !material) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Raw material not found.</p>
        <Link href="/raw-materials" className="text-sm text-slate-700 underline">
          Back to raw materials
        </Link>
      </div>
    );
  }

  const totalOnHand = (material.balances ?? []).reduce((s, b) => s + b.quantity, 0);
  const isLow = material.reorderLevel != null && totalOnHand <= material.reorderLevel;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/raw-materials"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Raw materials
        </Link>
        <PageHeader
          title={material.name}
          description="Stock by location, cost history, and movements"
          action={
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.CREATE}>
                <Button variant="outline" onClick={() => setOpeningOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Opening
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.ADJUST}>
                <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Adjust
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.UPDATE}>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setToggleOpen(true)}>
                  {isActive ? (
                    <>
                      <UserX className="h-4 w-4 text-amber-600" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Activate
                    </>
                  )}
                </Button>
              </PermissionGuard>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Unit</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{material.unit}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">SKU</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{material.sku || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">On hand</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {totalOnHand}
            {isLow && (
              <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Low
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Status</p>
          <div className="mt-1">
            <StatusBadge status={isActive ? "ACTIVE" : "INACTIVE"} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Reorder level
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {material.reorderLevel != null ? material.reorderLevel : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Current cost</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatMoney(material.defaultCost)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Notes</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{material.notes || "—"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cost History</h2>
            <p className="text-sm text-slate-500">
              New entries update current cost; older rows stay for history.
            </p>
          </div>
          <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.UPDATE}>
            <Button onClick={() => setCostOpen(true)}>
              <Plus className="h-4 w-4" />
              Update Cost
            </Button>
          </PermissionGuard>
        </div>

        <DataTable
          columns={costColumns}
          data={costs}
          isLoading={costsLoading}
          emptyState={
            <EmptyState
              title="No cost history"
              description="Add the first cost entry for this raw material."
            />
          }
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Balances by location</h3>
        {(material.balances ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No stock yet. Post opening stock to begin.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {material.balances.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{b.location.name}</span>
                <span className="font-medium text-slate-900">
                  {b.quantity} {material.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent movements</h3>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">No movements yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-800">{m.type}</span>
                  <span className="ml-2 text-slate-500">{m.location.name}</span>
                  {m.reason && <span className="ml-2 text-slate-400">· {m.reason}</span>}
                </div>
                <span className="font-medium text-slate-900">
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RawMaterialFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        rawMaterial={material}
      />
      <RawOpeningStockModal
        open={openingOpen}
        onClose={() => setOpeningOpen(false)}
        warehouseEnabled={warehouseEnabled}
        fixedRawMaterialId={id}
        onSuccess={invalidate}
      />
      <RawAdjustStockModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        warehouseEnabled={warehouseEnabled}
        fixedRawMaterialId={id}
        onSuccess={invalidate}
      />
      <UpdateRawMaterialCostModal
        open={costOpen}
        onClose={() => setCostOpen(false)}
        rawMaterialId={id}
      />

      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={() => toggleStatus.mutate()}
        title={isActive ? "Deactivate Raw Material" : "Activate Raw Material"}
        description={
          isActive
            ? `Deactivate "${material.name}"? Soft-deactivate only.`
            : `Activate "${material.name}" again?`
        }
        confirmLabel={isActive ? "Deactivate" : "Activate"}
        isLoading={toggleStatus.isPending}
      />
    </div>
  );
}
