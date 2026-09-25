import type { ApiEnvelope } from "@/types/api";

export interface DashboardProductUnits {
  productId: string;
  name: string;
  unitsDelivered: number;
}

export interface DashboardProductMonth {
  productId: string;
  name: string;
  unitsDelivered: number;
  revenue: number;
  cogs: number;
  grossMargin: number;
}

export interface DashboardRiderRow {
  riderId: string;
  name: string;
  unitsDelivered: number;
  cashCollected: number;
  cashHandedOver: number;
  cashBalance: number;
}

export interface DashboardPayload {
  date: string;
  today: {
    totalUnitsDelivered: number;
    byProduct: DashboardProductUnits[];
    totalSales: number;
    cashCollected: number;
    creditSales: number;
    totalExpenses: number;
    cashWithRiders: number;
    outstandingCustomerCount: number;
    outstandingAmount: number;
    collectionsDueTodayCount: number;
    collectionsDueTodayAmount: number;
  };
  thisMonth: {
    revenue: number;
    refillCOGS: number;
    operatingExpenses: number;
    grossProfit: number;
    netProfit: number;
    byProduct: DashboardProductMonth[];
  };
  riderSummary: DashboardRiderRow[];
}

export type DashboardResponse = ApiEnvelope<DashboardPayload>;
