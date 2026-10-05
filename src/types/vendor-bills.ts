import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export type VendorBillStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "VOID";
export type PaymentMethod = "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "OTHER";

export interface VendorBillListItem {
  id: string;
  tenantId: string;
  vendorId: string;
  purchaseOrderId: string | null;
  goodsReceiptId: string | null;
  billNumber: string | null;
  billDate: string;
  dueDate: string | null;
  notes: string | null;
  status: VendorBillStatus;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: string; name: string; phone: string | null };
}

export interface VendorBillLine {
  id: string;
  lineNo: number;
  description: string;
  qty: number;
  unitCost: number;
  amount: number;
}

export interface VendorBillPayment {
  id: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface VendorBillDetail extends VendorBillListItem {
  lines: VendorBillLine[];
  payments: VendorBillPayment[];
}

export interface ListVendorBillsParams {
  page?: number;
  limit?: number;
  vendorId?: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  status?: VendorBillStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type VendorBillsListPayload = {
  items: VendorBillListItem[];
  meta: PaginationMeta;
};

export interface CreateVendorBillPayload {
  vendorId: string;
  billDate: string;
  dueDate?: string | null;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  notes?: string | null;
  lines: Array<{
    description: string;
    qty: number;
    unitCost: number;
    purchaseOrderLineId?: string | null;
    goodsReceiptLineId?: string | null;
  }>;
}

export interface PayVendorBillPayload {
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export type VendorBillsListResponse = ApiEnvelope<VendorBillsListPayload>;
export type VendorBillDetailResponse = ApiEnvelope<VendorBillDetail>;

export interface VendorPayablesSummary {
  billedTotal: number;
  paidTotal: number;
  openTotal: number;
}

export interface VendorLedgerEntry {
  id: string;
  entryType: "BILL" | "PAYMENT" | "VOID";
  amount: number;
  signedAmount: number;
  debit: number;
  credit: number;
  runningBalance: number;
  notes: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

export interface VendorLedgerPayload {
  vendorId: string;
  vendorName: string;
  openingBalance: number;
  summary: VendorPayablesSummary;
  items: VendorLedgerEntry[];
  meta: PaginationMeta;
}

export interface VendorDuesBillRow {
  id: string;
  billNumber: string | null;
  billDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: VendorBillStatus;
  overdue: boolean;
  noDueDate: boolean;
}

export interface VendorDuesVendorGroup {
  vendorId: string;
  vendorName: string;
  phone: string | null;
  dueAmount: number;
  bills: VendorDuesBillRow[];
}

export interface VendorDuesPayload {
  date: string;
  totalDue: number;
  vendorCount: number;
  vendors: VendorDuesVendorGroup[];
}
