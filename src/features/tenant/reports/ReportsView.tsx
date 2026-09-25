"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { reportsApi } from "@/lib/reports-api";
import { staffApi } from "@/lib/staff-api";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  REPORTS_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
  VEHICLES_QUERY_KEY,
} from "@/constants/query-keys";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { ReportType } from "@/types/reports";

type Tab =
  | "daily-sales"
  | "monthly-summary"
  | "product-performance"
  | "customer-outstanding"
  | "container-inventory"
  | "rider-collection"
  | "vehicle-performance"
  | "expenses";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const TABS: { id: Tab; label: string }[] = [
  { id: "daily-sales", label: "Daily sales" },
  { id: "monthly-summary", label: "Monthly summary" },
  { id: "product-performance", label: "Product performance" },
  { id: "customer-outstanding", label: "Customer outstanding" },
  { id: "container-inventory", label: "Container inventory" },
  { id: "rider-collection", label: "Rider collection" },
  { id: "vehicle-performance", label: "Vehicle performance" },
  { id: "expenses", label: "Expenses" },
];

export function ReportsView() {
  const { toast } = useToast();
  const { enabled: containersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS);
  const [tab, setTab] = useState<Tab>("daily-sales");
  const [date, setDate] = useState(today());
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [riderId, setRiderId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.id !== "container-inventory" || containersEnabled),
    [containersEnabled]
  );

  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "reports"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
  });

  const vehiclesQuery = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, "reports"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
    enabled: tab === "vehicle-performance",
  });

  const reportQuery = useQuery({
    queryKey: [REPORTS_QUERY_KEY, tab, date, from, to, month, year, riderId, vehicleId, search],
    queryFn: async () => {
      switch (tab) {
        case "daily-sales":
          return reportsApi.dailySales(date);
        case "monthly-summary":
          return reportsApi.monthlySummary(month, year);
        case "product-performance":
          return reportsApi.productPerformance(from, to);
        case "customer-outstanding":
          return reportsApi.customerOutstanding();
        case "container-inventory":
          return reportsApi.containerInventory();
        case "rider-collection":
          return reportsApi.riderCollection(from, to, riderId || undefined);
        case "vehicle-performance":
          return reportsApi.vehiclePerformance(from, to, vehicleId || undefined);
        case "expenses":
          return reportsApi.expenses(from, to, search || undefined);
      }
    },
  });

  async function handleExport(format: "csv" | "pdf") {
    if (tab === "vehicle-performance") {
      toast({
        title: "Export not available for this report yet",
        variant: "error",
      });
      return;
    }
    setExporting(format);
    try {
      await reportsApi.exportFile({
        type: tab as ReportType,
        format,
        date,
        from,
        to,
        month,
        year,
        riderId: riderId || undefined,
        vehicleId: vehicleId || undefined,
        search: search || undefined,
      });
      toast({ title: `Exported ${format.toUpperCase()}`, variant: "success" });
    } catch (err) {
      toast({
        title: "Export failed",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    } finally {
      setExporting(null);
    }
  }

  const data = reportQuery.data?.data;

  return (
    <PermissionGuard
      permission={PERMISSIONS.REPORTS.READ}
      fallback={
        <EmptyState
          title="Reports access required"
          description="Ask an owner or admin for reports:read permission."
        />
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Operational analytics with CSV / PDF export"
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!!exporting || reportQuery.isLoading}
                onClick={() => handleExport("csv")}
              >
                {exporting === "csv" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!exporting || reportQuery.isLoading}
                onClick={() => handleExport("pdf")}
              >
                {exporting === "pdf" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {tab === "daily-sales" && (
            <Input
              type="date"
              className="w-auto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          {tab === "monthly-summary" && (
            <>
              <Select
                className="w-auto"
                value={String(month)}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString(undefined, { month: "long" })}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                className="w-28"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </>
          )}
          {(tab === "product-performance" ||
            tab === "rider-collection" ||
            tab === "vehicle-performance" ||
            tab === "expenses") && (
            <>
              <Input
                type="date"
                className="w-auto"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                type="date"
                className="w-auto"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </>
          )}
          {tab === "rider-collection" && (
            <Select className="w-auto" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
              <option value="">All riders</option>
              {(ridersQuery.data?.data?.items ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName}
                </option>
              ))}
            </Select>
          )}
          {tab === "vehicle-performance" && (
            <Select
              className="w-auto"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">All vehicles</option>
              {(vehiclesQuery.data?.data?.items ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.plateNumber ? ` (${v.plateNumber})` : ""}
                </option>
              ))}
            </Select>
          )}
          {tab === "expenses" && (
            <Input
              placeholder="Search title…"
              className="w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {tab === "container-inventory" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/container-inventory">Open full inventory</Link>
            </Button>
          )}
        </div>

        {reportQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading report…</p>
        ) : reportQuery.isError ? (
          <ErrorState title="Failed to load report" onRetry={() => reportQuery.refetch()} />
        ) : !data ? (
          <EmptyState title="No data" />
        ) : (
          <ReportBody tab={tab} data={data} />
        )}
      </div>
    </PermissionGuard>
  );
}

function ReportBody({ tab, data }: { tab: Tab; data: unknown }) {
  if (tab === "daily-sales") {
    const d = data as Awaited<ReturnType<typeof reportsApi.dailySales>>["data"];
    if (!d) return null;
    if (d.deliveries.length === 0) {
      return <EmptyState title="No deliveries" description={`Nothing on ${d.date}`} />;
    }
    return (
      <div className="space-y-4">
        {d.deliveries.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">
                {row.customerName} · {row.riderName}
              </p>
              <p className="text-sm text-slate-500">
                Sale {money(row.totalSale)} · Cash {money(row.cashReceived)} · {row.status}
              </p>
            </div>
            <ul className="space-y-1 text-sm text-slate-700">
              {row.items.map((item, i) => (
                <li key={`${row.id}-${i}`}>
                  {item.productName}: {item.quantityDelivered} @ {money(item.unitPrice)} ={" "}
                  {money(item.lineTotal)}
                  {item.emptiesReceived > 0 ? ` · empties ${item.emptiesReceived}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "monthly-summary") {
    const d = data as Awaited<ReturnType<typeof reportsApi.monthlySummary>>["data"];
    if (!d) return null;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Revenue", d.revenue],
            ["Delivery COGS", d.deliveryCOGS],
            ["Refill COGS", d.refillCOGS],
            ["Expenses", d.operatingExpenses],
            ["Gross profit", d.grossProfit],
            ["Net profit", d.netProfit],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{money(value as number)}</p>
            </div>
          ))}
        </div>
        <ProductTable rows={d.byProduct} />
      </div>
    );
  }

  if (tab === "product-performance") {
    const d = data as Awaited<ReturnType<typeof reportsApi.productPerformance>>["data"];
    if (!d) return null;
    return <ProductTable rows={d.products} />;
  }

  if (tab === "customer-outstanding") {
    const d = data as Awaited<ReturnType<typeof reportsApi.customerOutstanding>>["data"];
    if (!d) return null;
    if (d.customers.length === 0) return <EmptyState title="No outstanding balances" />;
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Total outstanding: <span className="font-semibold">{money(d.totalOutstanding)}</span>
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Age (days)</th>
              </tr>
            </thead>
            <tbody>
              {d.customers.map((c) => (
                <tr key={c.customerId} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.customerId}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.areaName ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{money(c.balance)}</td>
                  <td className="px-4 py-3 tabular-nums">{c.ageDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === "container-inventory") {
    const d = data as Awaited<ReturnType<typeof reportsApi.containerInventory>>["data"];
    if (!d) return null;
    if (d.products.length === 0) return <EmptyState title="No returnable products" />;
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Owned</th>
              <th className="px-4 py-3">With customers</th>
              <th className="px-4 py-3">On vehicles</th>
              <th className="px-4 py-3">On hand</th>
            </tr>
          </thead>
          <tbody>
            {d.products.map((p) => (
              <tr key={p.productId} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{p.productName}</td>
                <td className="px-4 py-3 tabular-nums">{p.ownedTotal}</td>
                <td className="px-4 py-3 tabular-nums">{p.withCustomers}</td>
                <td className="px-4 py-3 tabular-nums">{p.onVehicles}</td>
                <td className="px-4 py-3 tabular-nums">{p.onHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "rider-collection") {
    const d = data as Awaited<ReturnType<typeof reportsApi.riderCollection>>["data"];
    if (!d) return null;
    if (d.riders.length === 0) return <EmptyState title="No rider activity" />;
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Deliveries</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Cash</th>
            </tr>
          </thead>
          <tbody>
            {d.riders.map((r) => (
              <tr key={r.riderId} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 tabular-nums">{r.deliveriesCount}</td>
                <td className="px-4 py-3 tabular-nums">{r.unitsDelivered}</td>
                <td className="px-4 py-3 tabular-nums">{money(r.sales)}</td>
                <td className="px-4 py-3 tabular-nums">{money(r.cashCollected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "vehicle-performance") {
    const d = data as Awaited<ReturnType<typeof reportsApi.vehiclePerformance>>["data"];
    if (!d) return null;
    if (d.vehicles.length === 0) return <EmptyState title="No vehicle activity" />;
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Runs</th>
                <th className="px-4 py-3">Deliveries</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3">Cash</th>
                <th className="px-4 py-3">Expenses</th>
              </tr>
            </thead>
            <tbody>
              {d.vehicles.map((v) => (
                <tr key={v.vehicleId} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    {v.name}
                    {v.plateNumber ? (
                      <span className="block text-xs text-slate-500">{v.plateNumber}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{v.runsCount}</td>
                  <td className="px-4 py-3 tabular-nums">{v.deliveriesCount}</td>
                  <td className="px-4 py-3 tabular-nums">{v.unitsDelivered}</td>
                  <td className="px-4 py-3 tabular-nums">{money(v.totalSales)}</td>
                  <td className="px-4 py-3 tabular-nums">{money(v.cashCollected)}</td>
                  <td className="px-4 py-3 tabular-nums">{money(v.expenseTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.vehicles.map((v) =>
          v.series.length === 0 ? null : (
            <div
              key={`${v.vehicleId}-series`}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="mb-2 text-sm font-medium text-slate-900">{v.name} — daily trend</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase">
                    <tr>
                      <th className="px-2 py-1">Date</th>
                      <th className="px-2 py-1">Runs</th>
                      <th className="px-2 py-1">Sales</th>
                      <th className="px-2 py-1">Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.series.map((s) => (
                      <tr key={s.date} className="border-t border-slate-100">
                        <td className="px-2 py-1">{s.date}</td>
                        <td className="px-2 py-1 tabular-nums">{s.runs}</td>
                        <td className="px-2 py-1 tabular-nums">{money(s.sales)}</td>
                        <td className="px-2 py-1 tabular-nums">{money(s.expenses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  const d = data as Awaited<ReturnType<typeof reportsApi.expenses>>["data"];
  if (!d) return null;
  if (d.expenses.length === 0) return <EmptyState title="No expenses in range" />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Total: <span className="font-semibold">{money(d.total)}</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Staff</th>
            </tr>
          </thead>
          <tbody>
            {d.expenses.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{e.date}</td>
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3 tabular-nums">{money(e.amount)}</td>
                <td className="px-4 py-3">{e.vehicleName ?? "—"}</td>
                <td className="px-4 py-3">{e.staffName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductTable({
  rows,
}: {
  rows: Array<{
    productId: string;
    name: string;
    unitsDelivered: number;
    revenue: number;
    cogs: number;
    grossMargin: number;
  }>;
}) {
  if (rows.length === 0) return <EmptyState title="No product activity" />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Units</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">COGS</th>
            <th className="px-4 py-3">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.productId} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 tabular-nums">{r.unitsDelivered}</td>
              <td className="px-4 py-3 tabular-nums">{money(r.revenue)}</td>
              <td className="px-4 py-3 tabular-nums">{money(r.cogs)}</td>
              <td className="px-4 py-3 tabular-nums">{money(r.grossMargin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
