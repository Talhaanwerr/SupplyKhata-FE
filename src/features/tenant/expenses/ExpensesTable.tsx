"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Receipt } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { expensesApi } from "@/lib/expenses-api";
import { staffApi } from "@/lib/staff-api";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  EXPENSES_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
  VEHICLES_QUERY_KEY,
} from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { ExpenseFormModal } from "./ExpenseFormModal";
import type { Expense } from "@/types/expenses";

interface ExpensesTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function ExpensesTable({ createOpen, onCreateClose }: ExpensesTableProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [staffId, setStaffId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [paidByRider, setPaidByRider] = useState("");
  const [page, setPage] = useState(1);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "expense-filter"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
  });
  const vehiclesQuery = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, "expense-filter"],
    queryFn: () => vehiclesApi.list({ status: "ACTIVE", limit: 100 }),
  });
  const riders = ridersQuery.data?.data?.items ?? [];
  const vehicles = vehiclesQuery.data?.data?.items ?? [];

  const { data: res, isLoading } = useQuery({
    queryKey: [
      EXPENSES_QUERY_KEY,
      page,
      search,
      dateFrom,
      dateTo,
      staffId,
      vehicleId,
      paidByRider,
      pageSize,
    ],
    queryFn: () =>
      expensesApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        staffId: staffId || undefined,
        vehicleId: vehicleId || undefined,
        isPaidByRider: paidByRider === "" ? undefined : paidByRider === "true",
      }),
    placeholderData: (prev) => prev,
  });

  const expenses = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;
  const filterTotal = res?.data?.filterTotal ?? 0;

  const remove = useApiMutation((id: string) => expensesApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
      setDeleteExpense(null);
      toast({ title: "Expense deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteExpense(null);
    },
  });

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-slate-700">{new Date(row.date).toLocaleDateString()}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          {row.description && <p className="text-xs text-slate-500">{row.description}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => <span className="font-medium text-slate-900">{row.amount.toFixed(2)}</span>,
    },
    {
      key: "staff",
      header: "Staff",
      render: (row) =>
        row.staff ? (
          <span className="text-slate-700">
            {`${row.staff.firstName} ${row.staff.lastName}`.trim() || row.staff.email}
            {row.isPaidByRider ? " (paid)" : ""}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (row) => <span className="text-slate-700">{row.vehicle?.name ?? "—"}</span>,
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row) => <span className="text-slate-600">{row.paymentMethod}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard permission={PERMISSIONS.EXPENSES.UPDATE}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditExpense(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.EXPENSES.DELETE}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteExpense(row)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        Filter total: <span className="font-semibold text-slate-900">{filterTotal.toFixed(2)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search title..."
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          aria-label="Date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          aria-label="Date to"
        />
        <Select
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All riders/staff</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {`${r.firstName} ${r.lastName}`.trim() || r.email}
            </option>
          ))}
        </Select>
        <Select
          value={vehicleId}
          onChange={(e) => {
            setVehicleId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Select
          value={paidByRider}
          onChange={(e) => {
            setPaidByRider(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Paid by rider: any</option>
          <option value="true">Paid by rider</option>
          <option value="false">Not paid by rider</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={expenses}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No expenses"
            description="Record petrol, rent, and other costs with a free-text title."
          />
        }
      />

      <ExpenseFormModal open={createOpen} onClose={onCreateClose} />
      <ExpenseFormModal
        open={!!editExpense}
        onClose={() => setEditExpense(null)}
        expense={editExpense}
      />
      <ConfirmDialog
        open={!!deleteExpense}
        onClose={() => setDeleteExpense(null)}
        onConfirm={() => {
          if (deleteExpense) remove.mutate(deleteExpense.id);
        }}
        title="Delete expense?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isLoading={remove.isPending}
        variant="destructive"
      />
    </div>
  );
}
