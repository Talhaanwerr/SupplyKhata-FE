export type ReportType =
  | "daily-sales"
  | "monthly-summary"
  | "product-performance"
  | "customer-outstanding"
  | "customer-ledger"
  | "container-inventory"
  | "rider-collection"
  | "vehicle-performance"
  | "collection-performance"
  | "expenses"
  | "stock-on-hand"
  | "purchases-by-vendor"
  | "production-yield"
  | "raw-consumption";

/** Sales channel for daily / monthly / product reports (POS deferred). */
export type ReportSalesChannel = "delivery" | "orders";

export interface DailySalesReport {
  date: string;
  channel: ReportSalesChannel;
  deliveries: Array<{
    id: string;
    status: string;
    customerName: string;
    customerPhone: string;
    riderName: string;
    cashReceived: number;
    totalSale: number;
    items: Array<{
      productName: string;
      quantityDelivered: number;
      emptiesReceived: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  }>;
  orders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    paymentStatus: string;
    customerName: string;
    customerPhone: string;
    subtotal: number;
    discountTotal: number;
    deliveryCharges: number;
    total: number;
    amountPaid: number;
    amountDue: number;
    items: Array<{
      productName: string;
      quantity: number;
      quantityDelivered: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  }>;
}

export interface MonthlySummaryReport {
  month: number;
  year: number;
  channel: ReportSalesChannel;
  revenue: number;
  deliveryCOGS: number;
  refillCOGS: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  byProduct: Array<{
    productId: string;
    name: string;
    unitsDelivered: number;
    revenue: number;
    cogs: number;
    grossMargin: number;
  }>;
}

export interface ProductPerformanceReport {
  from: string;
  to: string;
  channel: ReportSalesChannel;
  products: Array<{
    productId: string;
    name: string;
    unitsDelivered: number;
    revenue: number;
    cogs: number;
    grossMargin: number;
  }>;
}

export interface CustomerOutstandingReport {
  totalOutstanding: number;
  customers: Array<{
    customerId: string;
    name: string;
    phone: string;
    areaName: string | null;
    balance: number;
    ageDays: number;
  }>;
}

export interface RiderCollectionReport {
  from: string;
  to: string;
  riders: Array<{
    riderId: string;
    name: string;
    deliveriesCount: number;
    unitsDelivered: number;
    sales: number;
    cashCollected: number;
  }>;
}

export interface ExpensesReport {
  from: string;
  to: string;
  total: number;
  expenses: Array<{
    id: string;
    title: string;
    description: string | null;
    date: string;
    amount: number;
    paymentMethod: string;
    isPaidByRider: boolean;
    vehicleName: string | null;
    staffName: string | null;
  }>;
}

export interface ContainerInventoryReport {
  products: Array<{
    productId: string;
    productName: string;
    ownedTotal: number;
    withCustomers: number;
    onVehicles: number;
    onHand: number;
  }>;
}

export interface VehiclePerformanceReport {
  from: string;
  to: string;
  vehicles: Array<{
    vehicleId: string;
    name: string;
    plateNumber: string | null;
    runsCount: number;
    deliveriesCount: number;
    unitsDelivered: number;
    totalSales: number;
    cashCollected: number;
    expenseTotal: number;
    expenseBreakdown: Array<{ title: string; amount: number }>;
    series: Array<{ date: string; runs: number; sales: number; expenses: number }>;
  }>;
}

export interface CollectionPerformanceReport {
  from: string;
  to: string;
  collectors: Array<{
    staffId: string;
    name: string;
    visits: number;
    collectedAmount: number;
    promisedCount: number;
    noContactCount: number;
  }>;
  byArea: Array<{
    areaId: string;
    name: string;
    collectedAmount: number;
    customersVisited: number;
  }>;
}

export interface StockOnHandReport {
  inventoryEnabled: boolean;
  rawMaterialsEnabled: boolean;
  locationId: string | null;
  finished: Array<{
    productId: string;
    productName: string;
    sku: string | null;
    baseUnit: string;
    locationId: string;
    locationName: string;
    quantity: number;
  }>;
  raw: Array<{
    rawMaterialId: string;
    rawMaterialName: string;
    sku: string | null;
    unit: string;
    locationId: string;
    locationName: string;
    quantity: number;
  }>;
  notes: string[];
}

export interface PurchasesByVendorReport {
  vendorsEnabled: boolean;
  purchaseOrdersEnabled: boolean;
  vendorBillsEnabled: boolean;
  from: string | null;
  to: string | null;
  vendors: Array<{
    vendorId: string;
    vendorName: string;
    phone: string | null;
    poCount: number;
    poOrderedAmount: number;
    billCount: number;
    billTotal: number;
    billPaid: number;
    billOutstanding: number;
  }>;
  notes: string[];
}

export interface ProductionYieldReport {
  productionEnabled: boolean;
  from: string | null;
  to: string | null;
  orders: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string | null;
    plannedQty: number;
    actualQty: number;
    scrapQty: number;
    varianceQty: number;
    varianceNote: string | null;
    scrapReason: string | null;
    completedAt: string | null;
  }>;
  notes: string[];
}

export interface RawConsumptionReport {
  productionEnabled: boolean;
  rawMaterialsEnabled: boolean;
  from: string | null;
  to: string | null;
  lines: Array<{
    rawMaterialId: string;
    rawMaterialName: string;
    unit: string;
    sku: string | null;
    qtyConsumed: number;
    orderCount: number;
  }>;
  notes: string[];
}
