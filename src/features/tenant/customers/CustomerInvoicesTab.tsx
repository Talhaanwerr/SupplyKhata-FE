"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { invoicesApi } from "@/lib/invoices-api";
import { CUSTOMER_INVOICES_QUERY_KEY } from "@/constants/query-keys";
import type { InvoiceStatus } from "@/types/invoices";

function money(n: number, currency?: string) {
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function statusVariant(status: InvoiceStatus): "default" | "pending" | "success" | "cancelled" {
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

interface CustomerInvoicesTabProps {
  customerId: string;
}

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
  const { data: res, isLoading } = useQuery({
    queryKey: [CUSTOMER_INVOICES_QUERY_KEY, customerId],
    queryFn: () => invoicesApi.listForCustomer(customerId, { page: 1, limit: 20 }),
    enabled: !!customerId,
  });

  const items = res?.data?.items ?? [];

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading invoices…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <EmptyState
          icon={FileText}
          title="No invoices"
          description="Generate a period invoice for this customer from the Invoices page."
        />
        <div className="mt-4 text-center">
          <Link href={`/invoices`} className="text-primary text-sm font-medium hover:underline">
            Go to Invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={`/invoices`} className="text-primary text-sm font-medium hover:underline">
          View all invoices
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Closing</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/invoices/${row.id}`}
                    className="hover:text-primary font-medium text-slate-900 hover:underline"
                  >
                    {row.invoiceNumber ?? "Draft"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {row.periodStart} → {row.periodEnd}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} variant={statusVariant(row.status)} />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {money(row.closingBalance, row.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
