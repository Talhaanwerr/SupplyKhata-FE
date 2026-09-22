export type StockType = "OPENING" | "CLOSING";
export type RunStatus = "OPEN" | "CLOSED";
export type PaymentMethod = "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "OTHER";
export type DeliveryStatus = "DELIVERED" | "PARTIAL" | "FAILED" | "CANCELLED";

export interface DeliveryRunStockPayload {
  productId: string;
  filledCount: number;
  emptyCount: number;
}

export interface DeliveryRunStock extends DeliveryRunStockPayload {
  id: string;
  stockType: StockType;
  product: { id: string; name: string };
}

export interface DeliveryPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DeliveryVehicle {
  id: string;
  name: string;
  plateNumber: string | null;
  type?: string | null;
}

export interface DeliveryCustomer {
  id: string;
  name: string;
  phone: string;
}

export interface DeliveryItem {
  id: string;
  productId: string;
  product: { id: string; name: string };
  quantityDelivered: number;
  emptiesReceived: number;
  sellingPriceSnapshot: number;
  unitCostSnapshot: number;
  lineTotal: number;
  createdAt?: string;
}

export interface DeliveryListItem {
  id: string;
  tenantId: string;
  deliveryRunId: string;
  customerId: string;
  customer: DeliveryCustomer;
  deliveryRun: {
    id: string;
    date: string;
    status: RunStatus;
    rider: DeliveryPerson;
    vehicle: DeliveryVehicle;
  };
  deliveryDate: string;
  cashReceived: number;
  paymentMethod: PaymentMethod;
  status: DeliveryStatus;
  notes: string | null;
  promisedPayDate?: string | null;
  promisedAmount?: number | null;
  totalSale: number;
  productsSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDetail extends DeliveryListItem {
  items: DeliveryItem[];
}

export interface DeliveryRunListItem {
  id: string;
  tenantId: string;
  riderId: string;
  vehicleId: string;
  date: string;
  openingCash: number;
  status: RunStatus;
  closingCash: number | null;
  totalSales: number;
  totalCashCollected: number;
  totalExpenses: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rider: DeliveryPerson;
  vehicle: DeliveryVehicle;
  deliveriesCount: number;
}

export interface DeliveryRunDetail extends Omit<DeliveryRunListItem, "deliveriesCount"> {
  stocks: DeliveryRunStock[];
  deliveries: DeliveryDetail[];
}

export interface ProductDiscrepancy {
  productId: string;
  productName: string;
  openingFilled: number;
  openingEmpty: number;
  closingFilled: number;
  closingEmpty: number;
  delivered: number;
  emptiesReturned: number;
  expectedClosingFilled: number;
  expectedClosingEmpty: number;
  filledDifference: number;
  emptyDifference: number;
  missingContainers: number;
}

export interface DeliveryRunSummary {
  runId: string;
  status: RunStatus;
  totalSales: number;
  totalCashCollected: number;
  expectedCash: number;
  closingCash: number | null;
  cashDifference: number | null;
  productDiscrepancies: ProductDiscrepancy[];
}

export interface CreateDeliveryRunPayload {
  riderId: string;
  vehicleId: string;
  date: string;
  openingCash: number;
  openingStock: DeliveryRunStockPayload[];
  notes?: string | null;
}

export interface CloseDeliveryRunPayload {
  closingCash: number;
  closingStock: DeliveryRunStockPayload[];
}

export interface UpdateDeliveryRunPayload {
  openingCash?: number;
  openingStock?: DeliveryRunStockPayload[];
  notes?: string | null;
}

export interface CreateDeliveryPayload {
  deliveryRunId: string;
  customerId: string;
  deliveryDate: string;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  notes?: string | null;
  promisedPayDate?: string | null;
  promisedAmount?: number | null;
  items: Array<{
    productId: string;
    quantityDelivered: number;
    emptiesReceived: number;
  }>;
}

export interface ListDeliveryRunsParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  riderId?: string;
  status?: RunStatus;
}

export interface ListDeliveriesParams {
  page?: number;
  limit?: number;
  runId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: DeliveryStatus;
}
