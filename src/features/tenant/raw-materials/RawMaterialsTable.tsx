"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, UserCheck, UserX } from "lucide-react";
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
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { RAW_MATERIALS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { RawMaterialFormModal } from "./RawMaterialFormModal";
import type { RawMaterial } from "@/types/raw-materials";

interface RawMaterialsTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

function formatCost(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function RawMaterialsTable({ createOpen, onCreateClose }: RawMaterialsTableProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<RawMaterial | null>(null);
  const [toggleRow, setToggleRow] = useState<RawMaterial | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const isActiveParam =
    activeFilter === "true" ? true : activeFilter === "false" ? false : undefined;

  const { data: res, isLoading } = useQuery({
    queryKey: [RAW_MATERIALS_QUERY_KEY, page, search, activeFilter, lowOnly, pageSize],
    queryFn: () =>
      rawMaterialsApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        isActive: isActiveParam,
        lowStockOnly: lowOnly || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const payload = res?.data;
  const rows = payload?.items ?? [];
  const totalPages = payload?.meta.totalPages ?? 1;

  const toggleStatus = useApiMutation(
    (row: RawMaterial) => rawMaterialsApi.update(row.id, { isActive: !row.isActive }),
    {
      onSuccess: (_res, row) => {
        qc.invalidateQueries({ queryKey: [RAW_MATERIALS_QUERY_KEY] });
        setToggleRow(null);
        toast({
          title: row.isActive ? "Raw material deactivated" : "Raw material activated",
          variant: "success",
        });
      },
      onError: (err) => {
        toast({
          title: "Could not update status",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  const columns: Column<RawMaterial>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <Link
          href={`/raw-materials/${row.id}`}
          className="font-medium text-slate-900 hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      render: (row) => <span className="text-slate-600">{row.unit}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      render: (row) => <span className="text-slate-600">{row.sku || "—"}</span>,
    },
    {
      key: "onHand",
      header: "On hand",
      render: (row) => (
        <span className="text-slate-700">
          {row.onHandQty ?? 0}
          {row.isLowStock ? (
            <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Low
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (row) => <span className="text-slate-600">{formatCost(row.defaultCost)}</span>,
    },
    {
      key: "reorder",
      header: "Reorder",
      render: (row) => (
        <span className="text-slate-600">{row.reorderLevel != null ? row.reorderLevel : "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/raw-materials/${row.id}`}>
            <Button variant="ghost" size="sm" aria-label="View raw material">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <PermissionGuard permission={PERMISSIONS.RAW_MATERIALS.UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit raw material"
              onClick={() => setEditRow(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={row.isActive ? "Deactivate" : "Activate"}
              onClick={() => setToggleRow(row)}
            >
              {row.isActive ? (
                <UserX className="h-4 w-4 text-amber-600" />
              ) : (
                <UserCheck className="h-4 w-4 text-green-600" />
              )}
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const deactivating = toggleRow?.isActive === true;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name or SKU…"
          className="sm:max-w-xs"
        />
        <Select
          className="w-40"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => {
              setLowOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300"
          />
          Low stock only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No raw materials yet"
            description="Add ingredients and packaging materials. Separate from finished products."
          />
        }
      />

      <RawMaterialFormModal open={createOpen} onClose={onCreateClose} />
      <RawMaterialFormModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        rawMaterial={editRow}
      />

      <ConfirmDialog
        open={!!toggleRow}
        onClose={() => setToggleRow(null)}
        onConfirm={() => {
          if (toggleRow) toggleStatus.mutate(toggleRow);
        }}
        title={deactivating ? "Deactivate Raw Material" : "Activate Raw Material"}
        description={
          toggleRow
            ? deactivating
              ? `Deactivate "${toggleRow.name}"? Soft-deactivate only.`
              : `Activate "${toggleRow.name}" again?`
            : ""
        }
        confirmLabel={deactivating ? "Deactivate" : "Activate"}
        isLoading={toggleStatus.isPending}
      />
    </>
  );
}
