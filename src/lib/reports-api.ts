import { API_URL } from "@/constants";
import { apiClient } from "./api-client";
import { tokenManager } from "./token";
import { ApiError } from "./api-error";
import type { ApiEnvelope } from "@/types/api";
import type {
  ContainerInventoryReport,
  CustomerOutstandingReport,
  DailySalesReport,
  ExpensesReport,
  MonthlySummaryReport,
  ProductPerformanceReport,
  ReportType,
  RiderCollectionReport,
  VehiclePerformanceReport,
  CollectionPerformanceReport,
} from "@/types/reports";

function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const reportsApi = {
  dailySales: (date?: string) =>
    apiClient.get<ApiEnvelope<DailySalesReport>>(`/reports/daily-sales${qs({ date })}`),

  monthlySummary: (month: number, year: number) =>
    apiClient.get<ApiEnvelope<MonthlySummaryReport>>(
      `/reports/monthly-summary${qs({ month, year })}`
    ),

  productPerformance: (from?: string, to?: string) =>
    apiClient.get<ApiEnvelope<ProductPerformanceReport>>(
      `/reports/product-performance${qs({ from, to })}`
    ),

  customerOutstanding: () =>
    apiClient.get<ApiEnvelope<CustomerOutstandingReport>>("/reports/customer-outstanding"),

  containerInventory: () =>
    apiClient.get<ApiEnvelope<ContainerInventoryReport>>("/reports/container-inventory"),

  riderCollection: (from?: string, to?: string, riderId?: string) =>
    apiClient.get<ApiEnvelope<RiderCollectionReport>>(
      `/reports/rider-collection${qs({ from, to, riderId })}`
    ),

  vehiclePerformance: (from?: string, to?: string, vehicleId?: string) =>
    apiClient.get<ApiEnvelope<VehiclePerformanceReport>>(
      `/reports/vehicle-performance${qs({ from, to, vehicleId })}`
    ),

  collectionPerformance: (from?: string, to?: string, collectorId?: string, areaId?: string) =>
    apiClient.get<ApiEnvelope<CollectionPerformanceReport>>(
      `/reports/collection-performance${qs({ from, to, collectorId, areaId })}`
    ),

  expenses: (from?: string, to?: string, search?: string) =>
    apiClient.get<ApiEnvelope<ExpensesReport>>(`/reports/expenses${qs({ from, to, search })}`),

  exportFile: async (params: {
    type: ReportType;
    format: "csv" | "pdf";
    date?: string;
    from?: string;
    to?: string;
    month?: number;
    year?: number;
    customerId?: string;
    riderId?: string;
    vehicleId?: string;
    search?: string;
  }) => {
    const query = qs(params);
    const token = tokenManager.getAccessToken();
    const res = await fetch(`${API_URL}/reports/export${query}`, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new ApiError(res.statusText || "Export failed", res.status);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match?.[1] ?? `report.${params.format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
