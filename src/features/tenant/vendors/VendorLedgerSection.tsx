"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { VENDOR_LEDGER_QUERY_KEY } from "@/constants/query-keys";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function VendorLedgerSection({ vendorId }: { vendorId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});
  const [page, setPage] = useState(1);

  const ledgerQuery = useQuery({
    queryKey: [VENDOR_LEDGER_QUERY_KEY, vendorId, page, applied.from, applied.to],
    queryFn: () =>
      vendorBillsApi.listLedger(vendorId, {
        page,
        limit: 20,
        from: applied.from,
        to: applied.to,
      }),
  });

  const payload = ledgerQuery.data?.data;
  const items = payload?.items ?? [];
  const meta = payload?.meta;
  const summary = payload?.summary;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Total billed</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {summary ? formatMoney(summary.billedTotal) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Total paid</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {summary ? formatMoney(summary.paidTotal) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Still to pay</p>
          <p className="mt-1 text-xl font-semibold text-amber-800">
            {summary ? formatMoney(summary.openTotal) : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPage(1);
            setApplied({ from: from || undefined, to: to || undefined });
          }}
        >
          Apply
        </Button>
        <Button asChild variant="secondary" className="ml-auto">
          <Link href="/vendor-bills/dues">Payables due</Link>
        </Button>
      </div>

      {ledgerQuery.isLoading && <p className="text-sm text-slate-500">Loading ledger…</p>}
      {ledgerQuery.isError && <p className="text-sm text-red-600">Could not load vendor ledger.</p>}

      {!ledgerQuery.isLoading && items.length === 0 ? (
        <EmptyState
          title="No ledger entries"
          description="Bills and payments for this vendor will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 text-right font-medium">Bill (+)</th>
                <th className="px-4 py-2 text-right font-medium">Paid (−)</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="px-4 py-2 text-slate-600">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{row.entryType}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {row.referenceId && row.referenceType === "VendorBill" ? (
                      <Link href={`/vendor-bills/${row.referenceId}`} className="underline">
                        {row.notes || "Bill"}
                      </Link>
                    ) : (
                      row.notes || "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.debit ? formatMoney(row.debit) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.credit ? formatMoney(row.credit) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {formatMoney(row.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
