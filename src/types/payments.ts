import type { PaymentMethod } from "./delivery";

export interface PaymentCustomer {
  id: string;
  name: string;
  phone: string;
  paymentCycle?: string;
  billingDueDate?: number | null;
  billingAnchorDate?: string | null;
}

export interface PaymentCollector {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PaymentListItem {
  id: string;
  tenantId: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  collectedById: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: PaymentCustomer;
  collectedBy: PaymentCollector | null;
}

export type PaymentDetail = PaymentListItem;

export interface CreatePaymentPayload {
  customerId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  collectedById?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export type UpdatePaymentPayload = Partial<Omit<CreatePaymentPayload, "customerId">>;

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  method?: PaymentMethod;
}

export interface PaymentDashboardCustomer {
  customerId: string;
  name: string;
  phone: string;
  balance: number;
  paymentCycle: string;
  billingDueDate: number | null;
  billingAnchorDate?: string | null;
  lastPaymentDate: string | null;
  daysOverdue: number;
  ageDays: number;
  dueDate?: string | null;
  promisedAmount?: number | null;
  source?: "PROMISED" | "CYCLE" | "SOFT";
}

export interface PaymentDashboard {
  dueToday: PaymentDashboardCustomer[];
  overdue: PaymentDashboardCustomer[];
  ageing: {
    bucket_0_7: number;
    bucket_8_30: number;
    bucket_31_60: number;
    bucket_60plus: number;
  };
  totalOutstanding: number;
}

export type LedgerEntryType =
  "DELIVERY_SALE" | "PAYMENT" | "ADJUSTMENT" | "OPENING_BALANCE" | "REFUND";

export interface LedgerEntryRow {
  id: string;
  entryType: LedgerEntryType;
  amount: number;
  debit: number;
  credit: number;
  runningBalance: number;
  description: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

export interface CustomerBalance {
  customerId: string;
  balance: number;
}

export interface CustomerLedgerPage {
  customerId: string;
  items: LedgerEntryRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CustomerStatement {
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  from: string | null;
  to: string | null;
  openingBalance: number;
  closingBalance: number;
  items: LedgerEntryRow[];
}

export interface ListLedgerParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}
