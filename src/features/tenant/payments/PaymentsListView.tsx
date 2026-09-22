"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { paymentsApi } from "@/lib/payments-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  CUSTOMER_BALANCE_QUERY_KEY,
  CUSTOMER_LEDGER_QUERY_KEY,
  PAYMENTS_DASHBOARD_QUERY_KEY,
  PAYMENTS_QUERY_KEY,
} from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { CustomerSearchSelect } from "@/features/tenant/customers/CustomerSearchSelect";
import type { PaymentMethod } from "@/types/delivery";
import type { PaymentDetail, PaymentListItem } from "@/types/payments";
import { PaymentsNav } from "./PaymentsNav";
import { EditPaymentModal } from "./EditPaymentModal";

const METHODS: PaymentMethod[] = ["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"];

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function PaymentsListView() {
  const [page, setPage] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [method, setMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editPayment, setEditPayment] = useState<PaymentDetail | null>(null);
  const [deletePayment, setDeletePayment] = useState<PaymentListItem | null>(null);
  const [viewPayment, setViewPayment] = useState<PaymentListItem | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, page, customerId, method, dateFrom, dateTo, pageSize],
    queryFn: () =>
      paymentsApi.list({
        page,
        limit: pageSize,
        customerId: customerId || undefined,
        method: method ? (method as PaymentMethod) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const payload = res?.data;
  const payments = payload?.items ?? [];
  const totalPages = payload?.meta.totalPages ?? 1;

  const loadForEdit = useApiMutation((id: string) => paymentsApi.get(id), {
    onSuccess: (r) => {
      if (r.data) setEditPayment(r.data);
    },
    onError: (err) => {
      toast({
        title: "Could not load payment",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  const remove = useApiMutation((row: PaymentListItem) => paymentsApi.remove(row.id), {
    onSuccess: (_r, row) => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY] });
      qc.invalidateQueries({
        queryKey: [CUSTOMER_BALANCE_QUERY_KEY, row.customerId],
      });
      qc.invalidateQueries({
        queryKey: [CUSTOMER_LEDGER_QUERY_KEY, row.customerId],
      });
      setDeletePayment(null);
      toast({ title: "Payment deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete payment",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeletePayment(null);
    },
  });

  const columns: Column<PaymentListItem>[] = useMemo(
    () => [
      {
        key: "paymentDate",
        header: "Date",
        render: (row) => formatDate(row.paymentDate),
      },
      {
        key: "customer",
        header: "Customer",
        render: (row) => (
          <div>
            <Link
              href={`/customers/${row.customerId}`}
              className="font-medium text-slate-900 hover:underline"
            >
              {row.customer.name}
            </Link>
            <p className="text-xs text-slate-500">{row.customer.phone}</p>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        render: (row) => (
          <span className="font-medium text-slate-900">{formatMoney(row.amount)}</span>
        ),
      },
      {
        key: "method",
        header: "Method",
        render: (row) => row.method,
      },
      {
        key: "collectedBy",
        header: "Collector",
        render: (row) =>
          row.collectedBy
            ? `${row.collectedBy.firstName} ${row.collectedBy.lastName}`.trim() ||
              row.collectedBy.email
            : "—",
      },
      {
        key: "reference",
        header: "Reference",
        render: (row) => row.reference || "—",
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="View payment"
              onClick={() => setViewPayment(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <PermissionGuard permission={PERMISSIONS.PAYMENTS.UPDATE}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit payment"
                onClick={() => loadForEdit.mutate(row.id)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.PAYMENTS.DELETE}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Delete payment"
                onClick={() => setDeletePayment(row)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [loadForEdit]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="All payments"
        description="Filter, view, edit, or delete recorded payments"
        action={
          <PermissionGuard permission={PERMISSIONS.PAYMENTS.CREATE}>
            <Button asChild>
              <Link href="/payments/record">
                <Plus className="h-4 w-4" />
                Record Payment
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <PaymentsNav />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Customer">
          <CustomerSearchSelect
            value={customerId}
            onChange={(id) => {
              setCustomerId(id);
              setPage(1);
            }}
            placeholder="Filter by customer…"
          />
        </FormField>
        <FormField label="Method">
          <Select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="From">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
        </FormField>
        <FormField label="To">
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </FormField>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No payments found"
            description="Try adjusting filters or record a new payment."
          />
        }
      />

      <EditPaymentModal
        open={!!editPayment}
        payment={editPayment}
        onClose={() => setEditPayment(null)}
      />

      <ConfirmDialog
        open={!!deletePayment}
        onClose={() => setDeletePayment(null)}
        title="Delete payment?"
        description={
          deletePayment
            ? `Delete payment of ${formatMoney(deletePayment.amount)} for ${deletePayment.customer.name}? This reverses the ledger entry.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
        onConfirm={() => {
          if (deletePayment) remove.mutate(deletePayment);
        }}
      />

      <Dialog open={!!viewPayment} onOpenChange={(v) => !v && setViewPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            <DialogDescription>
              {viewPayment
                ? `${viewPayment.customer.name} · ${formatDate(viewPayment.paymentDate)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewPayment && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-medium">{formatMoney(viewPayment.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Method</dt>
                <dd>{viewPayment.method}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Reference</dt>
                <dd>{viewPayment.reference || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Notes</dt>
                <dd className="text-right">{viewPayment.notes || "—"}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewPayment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
