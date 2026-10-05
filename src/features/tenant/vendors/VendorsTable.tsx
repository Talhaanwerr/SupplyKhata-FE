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
import { vendorsApi } from "@/lib/vendors-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { VENDORS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { VendorFormModal } from "./VendorFormModal";
import type { Vendor } from "@/types/vendors";

interface VendorsTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function VendorsTable({ createOpen, onCreateClose }: VendorsTableProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [toggleVendor, setToggleVendor] = useState<Vendor | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const isActiveParam =
    activeFilter === "true" ? true : activeFilter === "false" ? false : undefined;

  const { data: res, isLoading } = useQuery({
    queryKey: [VENDORS_QUERY_KEY, page, search, activeFilter, pageSize],
    queryFn: () =>
      vendorsApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        isActive: isActiveParam,
      }),
    placeholderData: (prev) => prev,
  });

  const payload = res?.data;
  const vendors = payload?.items ?? [];
  const totalPages = payload?.meta.totalPages ?? 1;

  const toggleStatus = useApiMutation(
    (row: Vendor) => vendorsApi.update(row.id, { isActive: !row.isActive }),
    {
      onSuccess: (_res, row) => {
        qc.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
        setToggleVendor(null);
        toast({
          title: row.isActive ? "Vendor deactivated" : "Vendor activated",
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

  const columns: Column<Vendor>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <Link href={`/vendors/${row.id}`} className="font-medium text-slate-900 hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => <span className="text-slate-600">{row.phone || "—"}</span>,
    },
    {
      key: "address",
      header: "Address",
      render: (row) => (
        <span className="line-clamp-1 max-w-[220px] text-slate-600">{row.address || "—"}</span>
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
          <Link href={`/vendors/${row.id}`}>
            <Button variant="ghost" size="sm" aria-label="View vendor">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <PermissionGuard permission={PERMISSIONS.VENDORS.UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit vendor"
              onClick={() => setEditVendor(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={row.isActive ? "Deactivate vendor" : "Activate vendor"}
              onClick={() => setToggleVendor(row)}
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

  const deactivating = toggleVendor?.isActive === true;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name or phone…"
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
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No vendors yet"
            description="Add suppliers here. Purchase orders and bills come later."
          />
        }
      />

      <VendorFormModal open={createOpen} onClose={onCreateClose} />
      <VendorFormModal
        open={!!editVendor}
        onClose={() => setEditVendor(null)}
        vendor={editVendor}
      />

      <ConfirmDialog
        open={!!toggleVendor}
        onClose={() => setToggleVendor(null)}
        onConfirm={() => {
          if (toggleVendor) toggleStatus.mutate(toggleVendor);
        }}
        title={deactivating ? "Deactivate Vendor" : "Activate Vendor"}
        description={
          toggleVendor
            ? deactivating
              ? `Deactivate "${toggleVendor.name}"? Soft-deactivate only — no hard delete.`
              : `Activate "${toggleVendor.name}" again?`
            : ""
        }
        confirmLabel={deactivating ? "Deactivate" : "Activate"}
        isLoading={toggleStatus.isPending}
      />
    </>
  );
}
