"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { PAYMENTS_DASHBOARD_QUERY_KEY } from "@/constants/query-keys";
import { paymentsApi } from "@/lib/payments-api";
import type { PaymentDashboardCustomer } from "@/types/payments";
import { PaymentsNav } from "./PaymentsNav";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function SourceBadge({ source }: { source?: PaymentDashboardCustomer["source"] }) {
  if (source !== "PROMISED") return null;
  return (
    <span className="ml-2 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
      Promised
    </span>
  );
}

function CollectionsTable({
  rows,
  emptyTitle,
  emptyDescription,
  showDaysOverdue,
}: {
  rows: PaymentDashboardCustomer[];
  emptyTitle: string;
  emptyDescription: string;
  showDaysOverdue?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Due date</th>
            <th className="px-4 py-3 font-medium">Balance</th>
            <th className="px-4 py-3 font-medium">Promised</th>
            <th className="px-4 py-3 font-medium">Last payment</th>
            {showDaysOverdue && <th className="px-4 py-3 font-medium">Days overdue</th>}
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.customerId} className="border-b border-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/customers/${row.customerId}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {row.name}
                </Link>
                <SourceBadge source={row.source} />
                <p className="text-xs text-slate-500">{row.phone}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(row.dueDate)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{formatMoney(row.balance)}</td>
              <td className="px-4 py-3 text-slate-600">
                {row.promisedAmount == null ? "—" : formatMoney(row.promisedAmount)}
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(row.lastPaymentDate)}</td>
              {showDaysOverdue && <td className="px-4 py-3 text-amber-700">{row.daysOverdue}</td>}
              <td className="px-4 py-3 text-right">
                <PermissionGuard permission={PERMISSIONS.PAYMENTS.CREATE}>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/payments/record?customerId=${row.customerId}`}>Record</Link>
                  </Button>
                </PermissionGuard>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentsDashboard() {
  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY],
    queryFn: () => paymentsApi.dashboard(),
  });

  const dash = res?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Today's collections (cycle + promised), overdue, and ageing"
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

      {isLoading && <p className="text-sm text-slate-500">Loading dashboard…</p>}
      {isError && <p className="text-sm text-red-600">Could not load payments dashboard.</p>}

      {dash && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Due Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-slate-900">{dash.dueToday.length}</p>
                <p className="mt-1 text-xs text-slate-500">
                  day-start collections (cycle + promised)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-amber-700">{dash.overdue.length}</p>
                <p className="mt-1 text-xs text-slate-500">customers past due</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Total Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-slate-900">
                  {formatMoney(dash.totalOutstanding)}
                </p>
                <p className="mt-1 text-xs text-slate-500">sum of open balances</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s collections</CardTitle>
              <p className="text-sm font-normal text-slate-500">
                Cycle dues and rider payment promises due today
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <CollectionsTable
                rows={dash.dueToday}
                emptyTitle="No collections due today"
                emptyDescription="Customers with cycle due or a promised pay date of today will appear here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ageing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">0–7 days</th>
                      <th className="px-4 py-3 font-medium">8–30 days</th>
                      <th className="px-4 py-3 font-medium">31–60 days</th>
                      <th className="px-4 py-3 font-medium">60+ days</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatMoney(dash.ageing.bucket_0_7)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatMoney(dash.ageing.bucket_8_30)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatMoney(dash.ageing.bucket_31_60)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatMoney(dash.ageing.bucket_60plus)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overdue customers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CollectionsTable
                rows={dash.overdue}
                emptyTitle="No overdue balances"
                emptyDescription="Customers with open balances past their due date will appear here."
                showDaysOverdue
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
