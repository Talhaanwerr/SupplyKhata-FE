"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customersApi } from "@/lib/customers-api";
import { CUSTOMER_STATEMENT_QUERY_KEY } from "@/constants/query-keys";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function StatementContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const customerId = params.id;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [CUSTOMER_STATEMENT_QUERY_KEY, customerId, from, to],
    queryFn: () => customersApi.statement(customerId, { from, to }),
    enabled: !!customerId,
  });

  const stmt = res?.data;

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading statement…</p>;
  }

  if (isError || !stmt) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Could not load statement.</p>
        <Link href={`/customers/${customerId}`} className="text-sm underline">
          Back to customer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/customers/${customerId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customer
        </Link>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h1 className="text-2xl font-semibold text-slate-900">Account Statement</h1>
        <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="text-slate-400">Customer:</span> {stmt.customer.name}
          </p>
          <p>
            <span className="text-slate-400">Phone:</span> {stmt.customer.phone}
          </p>
          <p className="sm:col-span-2">
            <span className="text-slate-400">Address:</span> {stmt.customer.address}
          </p>
          <p>
            <span className="text-slate-400">From:</span> {stmt.from ?? "Beginning"}
          </p>
          <p>
            <span className="text-slate-400">To:</span> {stmt.to ?? "Today"}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase">Opening balance</p>
            <p className="text-lg font-semibold">{formatMoney(stmt.openingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Closing balance</p>
            <p className="text-lg font-semibold">{formatMoney(stmt.closingBalance)}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 text-right font-medium">Debit</th>
                <th className="py-2 pr-3 text-right font-medium">Credit</th>
                <th className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {stmt.items.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{formatDate(row.createdAt)}</td>
                  <td className="py-2 pr-3">{row.entryType}</td>
                  <td className="py-2 pr-3">{row.description}</td>
                  <td className="py-2 pr-3 text-right">
                    {row.debit > 0 ? formatMoney(row.debit) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {row.credit > 0 ? formatMoney(row.credit) : "—"}
                  </td>
                  <td className="py-2 text-right font-medium">{formatMoney(row.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CustomerStatementView() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <StatementContent />
    </Suspense>
  );
}
