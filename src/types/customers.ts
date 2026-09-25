export type CustomerStatus = "ACTIVE" | "INACTIVE";

export type PaymentCycle = "CASH_ON_DELIVERY" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "CUSTOM";

export interface CustomerArea {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CustomerRider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CustomerProductPriceRow {
  id: string;
  productId: string;
  pricePerUnit: number;
  product: {
    id: string;
    name: string;
    defaultSellingPrice: number;
    isActive: boolean;
    unit: string | null;
    volume: number | null;
  };
}

export interface CustomerListItem {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  areaId: string;
  area: CustomerArea;
  status: CustomerStatus;
  paymentCycle: PaymentCycle;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  locationNotes: string | null;
  billingDueDate: number | null;
  billingAnchorDate: string | null;
  promisedDueDate: string | null;
  promisedDueAmount: number | null;
  openingReceivableBalance: number;
  containerDeposit: number;
  defaultRiderId: string | null;
  defaultRider: CustomerRider | null;
  productPrices: CustomerProductPriceRow[];
}

export interface CustomerProductPriceInput {
  productId: string;
  pricePerUnit: number;
}

export interface OpeningContainerInput {
  productId: string;
  quantity: number;
}

export interface CustomerContainerBalanceRow {
  productId: string;
  productName: string;
  balance: number;
  movementsCount: number;
}

export interface CreateCustomerPayload {
  name: string;
  email?: string | null;
  phone: string;
  secondaryPhone?: string | null;
  address: string;
  areaId?: string;
  areaName?: string;
  locationNotes?: string | null;
  status?: CustomerStatus;
  paymentCycle?: PaymentCycle;
  billingDueDate?: number | null;
  billingAnchorDate?: string | null;
  openingReceivableBalance?: number;
  containerDeposit?: number;
  defaultRiderId?: string | null;
  customerProductPrices?: CustomerProductPriceInput[];
  openingContainers?: OpeningContainerInput[];
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  areaId?: string;
}
