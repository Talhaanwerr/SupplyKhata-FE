export type InvoiceStatus = "DRAFT" | "ISSUED" | "VOID";

export type InvoicePeriodType = "WEEKLY" | "MONTHLY" | "CUSTOM";

export type InvoiceLineType =
  "OPENING" | "DELIVERY" | "ORDER" | "ORDER_FEE" | "PAYMENT" | "ADJUSTMENT" | "OTHER";

export interface InvoiceCustomerRef {
  id: string;
  name: string;
  phone: string;
}

export interface InvoiceUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface InvoiceLine {
  id: string;
  lineType: InvoiceLineType;
  productId: string | null;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  occurredAt: string | null;
  sortOrder: number;
}

export interface InvoiceListItem {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceNumber: string | null;
  periodStart: string;
  periodEnd: string;
  periodType: InvoicePeriodType;
  status: InvoiceStatus;
  currency: string;
  openingBalance: number;
  salesTotal: number;
  deliveriesTotal: number;
  ordersTotal: number;
  paymentsTotal: number;
  adjustmentsTotal: number;
  closingBalance: number;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: InvoiceCustomerRef;
  createdBy: InvoiceUserRef;
}

export interface InvoiceDetail extends InvoiceListItem {
  issuedById: string | null;
  voidedAt: string | null;
  voidedById: string | null;
  voidReason: string | null;
  notes: string | null;
  createdById: string;
  issuedBy: InvoiceUserRef | null;
  voidedBy: InvoiceUserRef | null;
  lines: InvoiceLine[];
}

export interface GenerateInvoicePayload {
  customerId: string;
  periodType: InvoicePeriodType;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface VoidInvoicePayload {
  reason: string;
}

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoicesListPayload {
  items: InvoiceListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const INVOICE_STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "VOID"];

export const INVOICE_PERIOD_TYPES: InvoicePeriodType[] = ["WEEKLY", "MONTHLY", "CUSTOM"];
