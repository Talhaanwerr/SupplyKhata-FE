"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomerSearchSelect } from "@/features/tenant/customers/CustomerSearchSelect";
import { invoicesApi } from "@/lib/invoices-api";
import { INVOICES_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { INVOICE_STATUSES, type InvoiceListItem, type InvoiceStatus } from "@/types/invoices";

function money(n: number, currency?: string) {
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function statusVariant(
  status: InvoiceStatus
): "default" | "pending" | "success" | "cancelled" | "error" {
  switch (status) {
    case "DRAFT":
      return "pending";
    case "ISSUED":
      return "success";
    case "VOID":
      return "cancelled";
    default:
      return "default";
  }
}

interface InvoicesTableProps {
  initialCustomerId?: string;
}

export function InvoicesTable({ initialCustomerId = "" }: InvoicesTableProps) {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: res, isLoading } = useQuery({
    queryKey: [INVOICES_QUERY_KEY, page, customerId, status, dateFrom, dateTo, pageSize],
    queryFn: () =>
      invoicesApi.list({
        page,
        limit: pageSize,
        customerId: customerId || undefined,
        status: (status || undefined) as InvoiceStatus | undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const invoices = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<InvoiceListItem>[] = [
    {
      key: "invoiceNumber",
      header: "Number",
      render: (row) => (
        <Link
          href={`/invoices/${row.id}`}
          className="hover:text-primary font-medium text-slate-900 hover:underline"
        >
          {row.invoiceNumber ?? "Draft"}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.customer.name}</p>
          <p className="text-xs text-slate-500">{row.customer.phone}</p>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (row) => (
        <span className="text-slate-700">
          {row.periodStart} → {row.periodEnd}
          <span className="ml-1 text-xs text-slate-400">({row.periodType})</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} variant={statusVariant(row.status)} />,
    },
    {
      key: "salesTotal",
      header: "Sales",
      render: (row) => (
        <span className="text-slate-700">{money(row.salesTotal, row.currency)}</span>
      ),
    },
    {
      key: "paymentsTotal",
      header: "Payments",
      render: (row) => (
        <span className="text-slate-700">{money(row.paymentsTotal, row.currency)}</span>
      ),
    },
    {
      key: "closingBalance",
      header: "Closing",
      render: (row) => (
        <span className="font-medium text-slate-900">
          {money(row.closingBalance, row.currency)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/invoices/${row.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CustomerSearchSelect
          value={customerId}
          onChange={(id) => {
            setCustomerId(id);
            setPage(1);
          }}
          allowCreate={false}
          placeholder="Filter by customer…"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
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
          aria-label="Period from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          aria-label="Period to"
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Generate a draft for a customer and period to get started."
          />
        }
      />
    </div>
  );
}
