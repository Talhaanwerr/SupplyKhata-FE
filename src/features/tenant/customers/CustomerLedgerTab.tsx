"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { customersApi } from "@/lib/customers-api";
import { PERMISSIONS } from "@/constants/permissions";
import { CUSTOMER_BALANCE_QUERY_KEY, CUSTOMER_LEDGER_QUERY_KEY } from "@/constants/query-keys";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function CustomerLedgerTab({
  customerId,
  promisedDueDate,
  promisedDueAmount,
}: {
  customerId: string;
  promisedDueDate?: string | null;
  promisedDueAmount?: number | null;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});
  const [page, setPage] = useState(1);

  const balanceQuery = useQuery({
    queryKey: [CUSTOMER_BALANCE_QUERY_KEY, customerId],
    queryFn: () => customersApi.balance(customerId),
  });

  const ledgerQuery = useQuery({
    queryKey: [CUSTOMER_LEDGER_QUERY_KEY, customerId, page, applied.from, applied.to],
    queryFn: () =>
      customersApi.ledger(customerId, {
        page,
        limit: 20,
        from: applied.from,
        to: applied.to,
      }),
  });

  const balance = balanceQuery.data?.data?.balance ?? 0;
  const ledger = ledgerQuery.data?.data;
  const items = ledger?.items ?? [];
  const meta = ledger?.meta;

  const statementHref = (() => {
    const q = new URLSearchParams();
    if (applied.from) q.set("from", applied.from);
    if (applied.to) q.set("to", applied.to);
    const s = q.toString();
    return `/customers/${customerId}/statement${s ? `?${s}` : ""}`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Running balance
          </p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {balanceQuery.isLoading ? "…" : formatMoney(balance)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Balance = sum of all ledger entries (not a stored field)
          </p>
          {promisedDueDate && (
            <p className="mt-2 text-sm text-amber-800">
              Promised due: {new Date(promisedDueDate).toLocaleDateString()}
              {promisedDueAmount != null ? ` · ${formatMoney(promisedDueAmount)}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission={PERMISSIONS.PAYMENTS.CREATE}>
            <Button asChild>
              <Link href={`/payments/record?customerId=${customerId}`}>Record Payment</Link>
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.LEDGER.READ}>
            <Button variant="outline" asChild>
              <Link href={statementHref}>
                <Printer className="h-4 w-4" />
                Print Statement
              </Link>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPage(1);
            setApplied({
              from: from || undefined,
              to: to || undefined,
            });
          }}
        >
          Apply
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFrom("");
            setTo("");
            setPage(1);
            setApplied({});
          }}
        >
          Clear
        </Button>
      </div>

      {ledgerQuery.isLoading && <p className="text-sm text-slate-500">Loading ledger…</p>}
      {ledgerQuery.isError && <p className="text-sm text-red-600">Could not load ledger.</p>}

      {!ledgerQuery.isLoading && items.length === 0 ? (
        <EmptyState
          title="No ledger entries"
          description="Deliveries and payments will appear here as they are recorded."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Debit</th>
                <th className="px-4 py-3 text-right font-medium">Credit</th>
                <th className="px-4 py-3 text-right font-medium">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.entryType}</td>
                  <td className="px-4 py-3 text-slate-700">{row.description}</td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.debit > 0 ? formatMoney(row.debit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {row.credit > 0 ? formatMoney(row.credit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatMoney(row.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
