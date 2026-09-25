"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, HandCoins } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { cashHandoversApi } from "@/lib/cash-handovers-api";
import { staffApi } from "@/lib/staff-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  CASH_HANDOVERS_QUERY_KEY,
  RIDER_CASH_BALANCE_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
} from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { CashHandoverFormModal } from "./CashHandoverFormModal";
import type { CashHandover } from "@/types/cash-handovers";

interface CashHandoversTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function CashHandoversTable({ createOpen, onCreateClose }: CashHandoversTableProps) {
  const [riderId, setRiderId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<CashHandover | null>(null);
  const [deleteRow, setDeleteRow] = useState<CashHandover | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "handover-filter"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
  });
  const riders = ridersQuery.data?.data?.items ?? [];

  const balanceQuery = useQuery({
    queryKey: [RIDER_CASH_BALANCE_QUERY_KEY, riderId],
    queryFn: () => cashHandoversApi.riderCashBalance(riderId),
    enabled: !!riderId,
  });
  const balance = balanceQuery.data?.data;

  const { data: res, isLoading } = useQuery({
    queryKey: [CASH_HANDOVERS_QUERY_KEY, page, riderId, dateFrom, dateTo, pageSize],
    queryFn: () =>
      cashHandoversApi.list({
        page,
        limit: pageSize,
        riderId: riderId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const remove = useApiMutation((id: string) => cashHandoversApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CASH_HANDOVERS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [RIDER_CASH_BALANCE_QUERY_KEY] });
      setDeleteRow(null);
      toast({ title: "Handover deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteRow(null);
    },
  });

  const columns: Column<CashHandover>[] = [
    {
      key: "handoverDate",
      header: "Date",
      render: (row) => (
        <span className="text-slate-700">{new Date(row.handoverDate).toLocaleDateString()}</span>
      ),
    },
    {
      key: "rider",
      header: "Rider",
      render: (row) => (
        <span className="font-medium text-slate-900">
          {`${row.rider.firstName} ${row.rider.lastName}`.trim() || row.rider.email}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => <span className="font-medium text-slate-900">{row.amount.toFixed(2)}</span>,
    },
    {
      key: "receivedBy",
      header: "Received by",
      render: (row) => (
        <span className="text-slate-700">
          {`${row.receivedBy.firstName} ${row.receivedBy.lastName}`.trim() || row.receivedBy.email}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (row) => <span className="text-slate-600">{row.reference || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard permission={PERMISSIONS.HANDOVERS.UPDATE}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditRow(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.HANDOVERS.DELETE}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteRow(row)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {riderId && balance && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-slate-500">Cash collected</p>
            <p className="font-semibold text-slate-900">{balance.cashCollected.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Rider-paid expenses</p>
            <p className="font-semibold text-slate-900">{balance.riderPaidExpenses.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Handed over</p>
            <p className="font-semibold text-slate-900">{balance.cashHandedOver.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Current balance</p>
            <p className="font-semibold text-emerald-700">{balance.currentBalance.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          value={riderId}
          onChange={(e) => {
            setRiderId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All riders</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {`${r.firstName} ${r.lastName}`.trim() || r.email}
            </option>
          ))}
        </Select>
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
            icon={HandCoins}
            title="No cash handovers"
            description="Record when a rider hands cash to the office."
          />
        }
      />

      <CashHandoverFormModal open={createOpen} onClose={onCreateClose} />
      <CashHandoverFormModal open={!!editRow} onClose={() => setEditRow(null)} handover={editRow} />
      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={() => {
          if (deleteRow) remove.mutate(deleteRow.id);
        }}
        title="Delete handover?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isLoading={remove.isPending}
        variant="destructive"
      />
    </div>
  );
}
