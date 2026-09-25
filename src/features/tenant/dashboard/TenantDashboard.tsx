"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Boxes, CreditCard, Package, TrendingUp, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardsSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApi } from "@/lib/dashboard-api";
import { DASHBOARD_QUERY_KEY } from "@/constants/query-keys";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/store/auth-store";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function TenantDashboard() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const canReports = usePermission(PERMISSIONS.REPORTS.READ);
  const [date, setDate] = useState(today());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, activeTenant?.id, date],
    queryFn: () => dashboardApi.get(date),
    enabled: canReports,
    staleTime: 30_000,
  });

  const payload = data?.data;

  if (!canReports) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Welcome to your workspace" />
        <EmptyState
          title="Reports access required"
          description="Ask an owner or admin to grant reports:read so you can see operational metrics."
        />
      </div>
    );
  }

  const todayCards = payload
    ? [
        {
          label: "Units delivered",
          value: String(payload.today.totalUnitsDelivered),
          icon: Package,
        },
        {
          label: "Total sales",
          value: money(payload.today.totalSales),
          icon: TrendingUp,
        },
        {
          label: "Cash collected",
          value: money(payload.today.cashCollected),
          icon: Banknote,
        },
        {
          label: "Credit sales",
          value: money(payload.today.creditSales),
          icon: CreditCard,
        },
        {
          label: "Expenses",
          value: money(payload.today.totalExpenses),
          icon: Wallet,
        },
        {
          label: "Cash with riders",
          value: money(payload.today.cashWithRiders),
          icon: Wallet,
        },
        {
          label: "Outstanding customers",
          value: `${payload.today.outstandingCustomerCount} · ${money(payload.today.outstandingAmount)}`,
          icon: Users,
          href: "/payments",
        },
        {
          label: "Collections due today",
          value: `${payload.today.collectionsDueTodayCount} · ${money(payload.today.collectionsDueTodayAmount)}`,
          icon: Banknote,
          href: "/payments",
        },
      ]
    : [];

  const monthCards = payload
    ? [
        { label: "Revenue", value: money(payload.thisMonth.revenue), tone: "neutral" as const },
        {
          label: "Refill COGS",
          value: money(payload.thisMonth.refillCOGS),
          tone: "neutral" as const,
        },
        {
          label: "Expenses",
          value: money(payload.thisMonth.operatingExpenses),
          tone: "neutral" as const,
        },
        {
          label: "Gross profit",
          value: money(payload.thisMonth.grossProfit),
          tone: payload.thisMonth.grossProfit >= 0 ? ("good" as const) : ("bad" as const),
        },
        {
          label: "Net profit",
          value: money(payload.thisMonth.netProfit),
          tone: payload.thisMonth.netProfit >= 0 ? ("good" as const) : ("bad" as const),
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={
          activeTenant?.name ? `Welcome to ${activeTenant.name}` : "Welcome to your workspace"
        }
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="text-sm text-slate-500" htmlFor="dash-date">
              Date
            </label>
            <Input
              id="dash-date"
              type="date"
              className="w-full sm:w-auto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton count={8} />
      ) : isError ? (
        <ErrorState title="Failed to load dashboard" onRetry={() => refetch()} />
      ) : !payload ? (
        <EmptyState title="No data" description="No dashboard metrics yet." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Today</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {todayCards.map((s) => {
                const card = <StatCard label={s.label} value={s.value} icon={s.icon} />;
                if (!s.href) return <div key={s.label}>{card}</div>;
                return (
                  <Link key={s.label} href={s.href} className="block transition hover:opacity-90">
                    {card}
                  </Link>
                );
              })}
            </div>
            {payload.today.byProduct.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
                {payload.today.byProduct.map((p) => (
                  <span
                    key={p.productId}
                    className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-900">{p.name}</span>: {p.unitsDelivered}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">This month</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {monthCards.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border p-4 ${
                    s.tone === "good"
                      ? "border-green-200 bg-green-50"
                      : s.tone === "bad"
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Units</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                    <th className="px-4 py-3 font-medium">COGS</th>
                    <th className="px-4 py-3 font-medium">Gross margin</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.thisMonth.byProduct.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No sales this month
                      </td>
                    </tr>
                  ) : (
                    payload.thisMonth.byProduct.map((row) => (
                      <tr key={row.productId} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                        <td className="px-4 py-3 tabular-nums">{row.unitsDelivered}</td>
                        <td className="px-4 py-3 tabular-nums">{money(row.revenue)}</td>
                        <td className="px-4 py-3 tabular-nums">{money(row.cogs)}</td>
                        <td className="px-4 py-3 tabular-nums">{money(row.grossMargin)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Rider summary (selected day)</h2>
              <Link href="/reports" className="text-primary text-xs hover:underline">
                All reports
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rider</th>
                    <th className="px-4 py-3 font-medium">Units</th>
                    <th className="px-4 py-3 font-medium">Cash collected</th>
                    <th className="px-4 py-3 font-medium">Handed over</th>
                    <th className="px-4 py-3 font-medium">Cash balance</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.riderSummary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No riders
                      </td>
                    </tr>
                  ) : (
                    payload.riderSummary.map((row) => (
                      <tr key={row.riderId} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                        <td className="px-4 py-3 tabular-nums">{row.unitsDelivered}</td>
                        <td className="px-4 py-3 tabular-nums">{money(row.cashCollected)}</td>
                        <td className="px-4 py-3 tabular-nums">{money(row.cashHandedOver)}</td>
                        <td className="px-4 py-3 tabular-nums">{money(row.cashBalance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <Link
            href="/container-inventory"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <Boxes className="h-4 w-4" /> Container inventory
          </Link>
        </>
      )}
    </div>
  );
}
