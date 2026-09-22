"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
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
import { customersApi } from "@/lib/customers-api";
import { areasApi } from "@/lib/areas-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { AREAS_QUERY_KEY, CUSTOMERS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { CustomerFormModal } from "./CustomerFormModal";
import type { CustomerDetail, CustomerListItem } from "@/types/customers";

interface CustomersTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function CustomersTable({ createOpen, onCreateClose }: CustomersTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [areaId, setAreaId] = useState("");
  const [page, setPage] = useState(1);
  const [editCustomer, setEditCustomer] = useState<CustomerDetail | null>(null);
  const [toggleCustomer, setToggleCustomer] = useState<CustomerListItem | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerListItem | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: areasRes } = useQuery({
    queryKey: [AREAS_QUERY_KEY, "filter"],
    queryFn: () => areasApi.list({ includeInactive: true }),
  });
  const areas = areasRes?.data ?? [];

  const { data: res, isLoading } = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, page, search, status, areaId, pageSize],
    queryFn: () =>
      customersApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        status: status === "ACTIVE" || status === "INACTIVE" ? status : undefined,
        areaId: areaId || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const payload = res?.data;
  const customers = payload?.items ?? [];
  const totalPages = payload?.meta.totalPages ?? 1;

  const loadForEdit = useApiMutation((id: string) => customersApi.get(id), {
    onSuccess: (r) => {
      if (r.data) setEditCustomer(r.data);
    },
    onError: (err) => {
      toast({
        title: "Could not load customer",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  const toggleStatus = useApiMutation(
    (row: CustomerListItem) =>
      customersApi.update(row.id, {
        status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
        setToggleCustomer(null);
        toast({ title: "Customer status updated", variant: "success" });
      },
      onError: (err) => {
        toast({
          title: "Could not update status",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
        setToggleCustomer(null);
      },
    }
  );

  const remove = useApiMutation((id: string) => customersApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      setDeleteCustomer(null);
      toast({ title: "Customer deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete customer",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteCustomer(null);
    },
  });

  const columns: Column<CustomerListItem>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <Link href={`/customers/${row.id}`} className="font-medium text-slate-900 hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => <span className="text-slate-600">{row.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="text-slate-600">{row.email || "—"}</span>,
    },
    {
      key: "area",
      header: "Area",
      render: (row) => row.area?.name ?? "—",
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
          <Link href={`/customers/${row.id}`}>
            <Button variant="ghost" size="sm" aria-label="View customer">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <PermissionGuard permission={PERMISSIONS.CUSTOMERS.UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit customer"
              onClick={() => loadForEdit.mutate(row.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle status"
              onClick={() => setToggleCustomer(row)}
            >
              {row.status === "ACTIVE" ? (
                <UserX className="h-4 w-4 text-amber-600" />
              ) : (
                <UserCheck className="h-4 w-4 text-green-600" />
              )}
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.CUSTOMERS.DELETE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete customer"
              onClick={() => setDeleteCustomer(row)}
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
          placeholder="Search name, phone, email…"
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
        <Select
          className="w-48"
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No customers yet"
            description="Add your first customer to start taking orders."
          />
        }
      />

      <CustomerFormModal open={createOpen} onClose={onCreateClose} />
      <CustomerFormModal
        open={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        customer={editCustomer}
      />

      <ConfirmDialog
        open={!!toggleCustomer}
        onClose={() => setToggleCustomer(null)}
        onConfirm={() => {
          if (toggleCustomer) toggleStatus.mutate(toggleCustomer);
        }}
        title={toggleCustomer?.status === "ACTIVE" ? "Deactivate Customer" : "Activate Customer"}
        description={
          toggleCustomer
            ? `${toggleCustomer.status === "ACTIVE" ? "Deactivate" : "Activate"} "${toggleCustomer.name}"?`
            : ""
        }
        confirmLabel={toggleCustomer?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        isLoading={toggleStatus.isPending}
      />

      <ConfirmDialog
        open={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={() => {
          if (deleteCustomer) remove.mutate(deleteCustomer.id);
        }}
        title="Delete Customer"
        description={
          deleteCustomer
            ? `Delete "${deleteCustomer.name}"? This cannot be undone from the list.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </>
  );
}
