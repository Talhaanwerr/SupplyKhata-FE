"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { localTodayYmd } from "@/lib/calendar-date";
import { VENDOR_DUES_QUERY_KEY } from "@/constants/query-keys";

function today() {
  return localTodayYmd();
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function VendorPayablesDuesView() {
  const [date, setDate] = useState(today());

  const duesQuery = useQuery({
    queryKey: [VENDOR_DUES_QUERY_KEY, date],
    queryFn: () => vendorBillsApi.listDues({ date }),
  });

  const payload = duesQuery.data?.data;
  const vendors = payload?.vendors ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payables Due"
        description="Vendors you need to pay on or before the selected date."
        action={
          <div className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">As of date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value || today())}
              />
            </div>
          </div>
        }
      />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Total to pay</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">
            {duesQuery.isLoading ? "…" : formatMoney(payload?.totalDue ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Vendors</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {duesQuery.isLoading ? "…" : (payload?.vendorCount ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Date</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {payload?.date ? new Date(payload.date + "T00:00:00").toLocaleDateString() : date}
          </p>
        </div>
      </div>

      {duesQuery.isLoading && <p className="text-sm text-slate-500">Loading payables…</p>}
      {duesQuery.isError && <p className="text-sm text-red-600">Could not load payables due.</p>}

      {!duesQuery.isLoading && vendors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={CalendarClock}
            title="Nothing due"
            description="No open vendor bills are due on or before this date."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map((v) => (
            <div key={v.vendorId} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    href={`/vendors/${v.vendorId}`}
                    className="text-base font-semibold text-slate-900 underline"
                  >
                    {v.vendorName}
                  </Link>
                  {v.phone ? <p className="text-sm text-slate-500">{v.phone}</p> : null}
                </div>
                <p className="text-lg font-semibold text-amber-800">{formatMoney(v.dueAmount)}</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {v.bills.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/vendor-bills/${b.id}`} className="font-medium underline">
                        {b.billNumber || b.id.slice(0, 8)}
                      </Link>
                      <StatusBadge status={b.status} />
                      {b.overdue ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                          Overdue
                        </span>
                      ) : null}
                      {b.noDueDate ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                          No due date
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right text-slate-600">
                      <div>Due {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : "—"}</div>
                      <div className="font-medium text-slate-900">{formatMoney(b.remaining)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
