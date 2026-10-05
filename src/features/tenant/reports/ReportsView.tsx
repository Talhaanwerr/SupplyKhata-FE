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
import { localTodayYmd } from "@/lib/calendar-date";
import { staffApi } from "@/lib/staff-api";
import { vehiclesApi } from "@/lib/vehicles-api";
import { vendorsApi } from "@/lib/vendors-api";
import { inventoryApi } from "@/lib/inventory-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  INVENTORY_QUERY_KEY,
  REPORTS_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
  VEHICLES_QUERY_KEY,
  VENDORS_QUERY_KEY,
} from "@/constants/query-keys";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { ReportSalesChannel, ReportType } from "@/types/reports";

type Tab =
  | "daily-sales"
  | "monthly-summary"
  | "product-performance"
  | "customer-outstanding"
  | "container-inventory"
  | "rider-collection"
  | "vehicle-performance"
  | "expenses"
  | "stock-on-hand"
  | "purchases-by-vendor"
  | "production-yield"
  | "raw-consumption";

function today() {
  return localTodayYmd();
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const TABS: { id: Tab; label: string; flag?: string }[] = [
  { id: "daily-sales", label: "Daily sales" },
  { id: "monthly-summary", label: "Monthly summary" },
  { id: "product-performance", label: "Product performance" },
  { id: "customer-outstanding", label: "Customer outstanding" },
  { id: "container-inventory", label: "Container inventory" },
  { id: "rider-collection", label: "Rider collection" },
  { id: "vehicle-performance", label: "Vehicle performance" },
  { id: "expenses", label: "Expenses" },
  { id: "stock-on-hand", label: "Stock on hand" },
  { id: "purchases-by-vendor", label: "Purchases by vendor" },
  { id: "production-yield", label: "Production yield" },
  { id: "raw-consumption", label: "Raw consumption" },
];

const CHANNEL_TABS: Tab[] = ["daily-sales", "monthly-summary", "product-performance"];

export function ReportsView() {
  const { toast } = useToast();
  const { enabled: containersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS);
  const { enabled: ordersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.ORDERS);
  const { enabled: inventoryEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.INVENTORY);
  const { enabled: rawEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RAW_MATERIALS);
  const { enabled: vendorsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDORS);
  const { enabled: productionEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.PRODUCTION);
  const [tab, setTab] = useState<Tab>("daily-sales");
  const [channel, setChannel] = useState<ReportSalesChannel>("delivery");
  const [date, setDate] = useState(today());
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [riderId, setRiderId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const visibleTabs = useMemo(
    () =>
      TABS.filter((t) => {
        if (t.id === "container-inventory") return containersEnabled;
        if (t.id === "stock-on-hand") return inventoryEnabled || rawEnabled;
        if (t.id === "purchases-by-vendor") return vendorsEnabled;
        if (t.id === "production-yield") return productionEnabled;
        if (t.id === "raw-consumption") return productionEnabled && rawEnabled;
        return true;
      }),
    [containersEnabled, inventoryEnabled, rawEnabled, vendorsEnabled, productionEnabled]
  );

  const showChannel = ordersEnabled && CHANNEL_TABS.includes(tab);
  const effectiveChannel: ReportSalesChannel =
    showChannel && channel === "orders" ? "orders" : "delivery";

  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "reports"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
  });

  const vehiclesQuery = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, "reports"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
    enabled: tab === "vehicle-performance",
  });

  const vendorsQuery = useQuery({
    queryKey: [VENDORS_QUERY_KEY, "reports"],
    queryFn: () => vendorsApi.list({ isActive: true, limit: 100 }),
    enabled: tab === "purchases-by-vendor" && vendorsEnabled,
  });

  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "reports"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
    enabled: tab === "stock-on-hand" && inventoryEnabled,
  });

  const reportQuery = useQuery({
    queryKey: [
      REPORTS_QUERY_KEY,
      tab,
      date,
      from,
      to,
      month,
      year,
      riderId,
      vehicleId,
      search,
      locationId,
      vendorId,
      effectiveChannel,
    ],
    queryFn: async () => {
      switch (tab) {
        case "daily-sales":
          return reportsApi.dailySales(date, effectiveChannel);
        case "monthly-summary":
          return reportsApi.monthlySummary(month, year, effectiveChannel);
        case "product-performance":
          return reportsApi.productPerformance(from, to, effectiveChannel);
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
        case "stock-on-hand":
          return reportsApi.stockOnHand(locationId || undefined);
        case "purchases-by-vendor":
          return reportsApi.purchasesByVendor(from, to, vendorId || undefined);
        case "production-yield":
          return reportsApi.productionYield(from, to);
        case "raw-consumption":
          return reportsApi.rawConsumption(from, to);
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
        channel: showChannel ? effectiveChannel : undefined,
        locationId: locationId || undefined,
        vendorId: vendorId || undefined,
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

        <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-slate-200 px-1 pb-2">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showChannel && (
            <Select
              value={effectiveChannel}
              onChange={(e) => setChannel(e.target.value as ReportSalesChannel)}
            >
              <option value="delivery">Delivery sales</option>
              <option value="orders">Order sales</option>
            </Select>
          )}
          {tab === "daily-sales" && (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          {tab === "monthly-summary" && (
            <>
              <Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString(undefined, { month: "long" })}
                  </option>
                ))}
              </Select>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </>
          )}
          {(tab === "product-performance" ||
            tab === "rider-collection" ||
            tab === "vehicle-performance" ||
            tab === "expenses" ||
            tab === "purchases-by-vendor" ||
            tab === "production-yield" ||
            tab === "raw-consumption") && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          {tab === "stock-on-hand" && inventoryEnabled && (
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {(locationsQuery.data?.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.isDefault ? " (default)" : ""}
                </option>
              ))}
            </Select>
          )}
          {tab === "purchases-by-vendor" && (
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">All vendors</option>
              {(vendorsQuery.data?.data?.items ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          )}
          {tab === "rider-collection" && (
            <Select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
              <option value="">All riders</option>
              {(ridersQuery.data?.data?.items ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName}
                </option>
              ))}
            </Select>
          )}
          {tab === "vehicle-performance" && (
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
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
              placeholder="Search titleâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {tab === "container-inventory" && (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href="/container-inventory">Open full inventory</Link>
            </Button>
          )}
        </div>

        {reportQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading reportâ€¦</p>
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

    if (d.channel === "orders") {
      if (!d.orders?.length) {
        return <EmptyState title="No orders" description={`Nothing placed on ${d.date}`} />;
      }
      return (
        <div className="space-y-4">
          {d.orders.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">
                  Order #{row.orderNumber} Â· {row.customerName}
                </p>
                <p className="text-sm text-slate-500">
                  Total {money(row.total)} Â· Paid {money(row.amountPaid)} Â· {row.status} Â·{" "}
                  {row.paymentStatus}
                </p>
              </div>
              <ul className="space-y-1 text-sm text-slate-700">
                {row.items.map((item, i) => (
                  <li key={`${row.id}-${i}`}>
                    {item.productName}: {item.quantity} @ {money(item.unitPrice)} ={" "}
                    {money(item.lineTotal)}
                    {item.quantityDelivered > 0 ? ` Â· delivered ${item.quantityDelivered}` : ""}
                  </li>
                ))}
              </ul>
              {(row.deliveryCharges > 0 || row.discountTotal > 0) && (
                <p className="mt-2 text-xs text-slate-500">
                  {row.discountTotal > 0 ? `Discount ${money(row.discountTotal)} Â· ` : ""}
                  {row.deliveryCharges > 0 ? `Delivery charges ${money(row.deliveryCharges)}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (!d.deliveries?.length) {
      return <EmptyState title="No deliveries" description={`Nothing on ${d.date}`} />;
    }
    return (
      <div className="space-y-4">
        {d.deliveries.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">
                {row.customerName} Â· {row.riderName}
              </p>
              <p className="text-sm text-slate-500">
                Sale {money(row.totalSale)} Â· Cash {money(row.cashReceived)} Â· {row.status}
              </p>
            </div>
            <ul className="space-y-1 text-sm text-slate-700">
              {row.items.map((item, i) => (
                <li key={`${row.id}-${i}`}>
                  {item.productName}: {item.quantityDelivered} @ {money(item.unitPrice)} ={" "}
                  {money(item.lineTotal)}
                  {item.emptiesReceived > 0 ? ` Â· empties ${item.emptiesReceived}` : ""}
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
    const cogsLabel = d.channel === "orders" ? "Order COGS" : "Delivery COGS";
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Revenue", d.revenue],
            [cogsLabel, d.deliveryCOGS],
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
                  <td className="px-4 py-3">{c.areaName ?? "â€”"}</td>
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
              <p className="mb-2 text-sm font-medium text-slate-900">{v.name} â€” daily trend</p>
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

  if (tab === "stock-on-hand") {
    const d = data as Awaited<ReturnType<typeof reportsApi.stockOnHand>>["data"];
    if (!d) return null;
    return (
      <div className="space-y-4">
        {d.notes?.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {d.notes.join(" ")}
          </p>
        )}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Finished goods</h3>
          {d.finished.length === 0 ? (
            <EmptyState title="No finished stock rows" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {d.finished.map((r) => (
                    <tr
                      key={`${r.productId}-${r.locationId}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 font-medium">{r.productName}</td>
                      <td className="px-4 py-3">{r.locationName}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {r.quantity} {r.baseUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Raw materials</h3>
          {d.raw.length === 0 ? (
            <EmptyState title="No raw stock rows" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Raw material</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {d.raw.map((r) => (
                    <tr
                      key={`${r.rawMaterialId}-${r.locationId}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 font-medium">{r.rawMaterialName}</td>
                      <td className="px-4 py-3">{r.locationName}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {r.quantity} {r.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tab === "purchases-by-vendor") {
    const d = data as Awaited<ReturnType<typeof reportsApi.purchasesByVendor>>["data"];
    if (!d) return null;
    return (
      <div className="space-y-3">
        {d.notes?.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {d.notes.join(" ")}
          </p>
        )}
        {d.vendors.length === 0 ? (
          <EmptyState title="No purchase activity in range" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">POs</th>
                  <th className="px-4 py-3">PO amount</th>
                  <th className="px-4 py-3">Bills</th>
                  <th className="px-4 py-3">Bill total</th>
                  <th className="px-4 py-3">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {d.vendors.map((v) => (
                  <tr key={v.vendorId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{v.vendorName}</td>
                    <td className="px-4 py-3 tabular-nums">{v.poCount}</td>
                    <td className="px-4 py-3 tabular-nums">{money(v.poOrderedAmount)}</td>
                    <td className="px-4 py-3 tabular-nums">{v.billCount}</td>
                    <td className="px-4 py-3 tabular-nums">{money(v.billTotal)}</td>
                    <td className="px-4 py-3 tabular-nums">{money(v.billOutstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (tab === "production-yield") {
    const d = data as Awaited<ReturnType<typeof reportsApi.productionYield>>["data"];
    if (!d) return null;
    return (
      <div className="space-y-3">
        {d.notes?.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {d.notes.join(" ")}
          </p>
        )}
        {d.orders.length === 0 ? (
          <EmptyState title="No completed production in range" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Planned</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Scrap</th>
                  <th className="px-4 py-3">Variance</th>
                  <th className="px-4 py-3">Completed</th>
                </tr>
              </thead>
              <tbody>
                {d.orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{o.productName}</td>
                    <td className="px-4 py-3 tabular-nums">{o.plannedQty}</td>
                    <td className="px-4 py-3 tabular-nums">{o.actualQty}</td>
                    <td className="px-4 py-3 tabular-nums">{o.scrapQty}</td>
                    <td className="px-4 py-3 tabular-nums">{o.varianceQty}</td>
                    <td className="px-4 py-3">{o.completedAt?.slice(0, 10) ?? "â€”"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (tab === "raw-consumption") {
    const d = data as Awaited<ReturnType<typeof reportsApi.rawConsumption>>["data"];
    if (!d) return null;
    return (
      <div className="space-y-3">
        {d.notes?.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {d.notes.join(" ")}
          </p>
        )}
        {d.lines.length === 0 ? (
          <EmptyState title="No raw consumption in range" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Raw material</th>
                  <th className="px-4 py-3">Consumed</th>
                  <th className="px-4 py-3">Orders</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((l) => (
                  <tr key={l.rawMaterialId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{l.rawMaterialName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {l.qtyConsumed} {l.unit}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{l.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (tab !== "expenses") return <EmptyState title="No data" />;

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
                <td className="px-4 py-3">{e.vehicleName ?? "â€”"}</td>
                <td className="px-4 py-3">{e.staffName ?? "â€”"}</td>
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
