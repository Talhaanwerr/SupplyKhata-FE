import type { ApiEnvelope } from "@/types/api";
import type { PaginationMeta } from "@/types";

export type PurchaseOrderStatus =
  "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderLine {
  id: string;
  lineNo: number;
  rawMaterialId: string | null;
  productId: string | null;
  qtyOrdered: number;
  unitCost: number;
  qtyReceived: number;
  remaining: number;
  product: { id: string; name: string; sku: string | null; baseUnit: string } | null;
  rawMaterial: { id: string; name: string; sku: string | null; unit: string } | null;
}

export interface PurchaseOrderListItem {
  id: string;
  tenantId: string;
  vendorId: string;
  status: PurchaseOrderStatus;
  poNumber: string | null;
  expectedDate: string | null;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: { id: string; name: string; phone: string | null; isActive: boolean };
  lineCount: number;
}

export interface PurchaseOrderDetail extends Omit<PurchaseOrderListItem, "lineCount"> {
  lines: PurchaseOrderLine[];
}

export interface ListPurchaseOrdersParams {
  page?: number;
  limit?: number;
  vendorId?: string;
  status?: PurchaseOrderStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type PurchaseOrdersListPayload = {
  items: PurchaseOrderListItem[];
  meta: PaginationMeta;
};

export interface PurchaseOrderLineInput {
  rawMaterialId?: string | null;
  productId?: string | null;
  qtyOrdered: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  vendorId: string;
  expectedDate?: string | null;
  notes?: string | null;
  lines: PurchaseOrderLineInput[];
}

export interface UpdatePurchaseOrderPayload {
  vendorId?: string;
  expectedDate?: string | null;
  notes?: string | null;
  lines?: PurchaseOrderLineInput[];
}

export interface GoodsReceiptListItem {
  id: string;
  purchaseOrderId: string;
  locationId: string;
  receiptDate: string;
  notes: string | null;
  createdAt: string;
  location: { id: string; name: string };
  receivedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  purchaseOrder: { id: string; poNumber: string | null; status: PurchaseOrderStatus };
  lineCount: number;
}

export interface GoodsReceiptVendorBillRef {
  id: string;
  billNumber: string | null;
  totalAmount: number;
  remaining: number;
}

export interface GoodsReceiptDetail {
  id: string;
  purchaseOrderId: string;
  locationId: string;
  receiptDate: string;
  notes: string | null;
  createdAt: string;
  location: { id: string; name: string; type: string };
  receivedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  purchaseOrder: { id: string; poNumber: string | null; status: PurchaseOrderStatus };
  lines: Array<{
    id: string;
    purchaseOrderLineId: string;
    qtyReceived: number;
    purchaseOrderLine: {
      id: string;
      lineNo: number;
      unitCost: number;
      product: { id: string; name: string; sku: string | null } | null;
      rawMaterial: { id: string; name: string; sku: string | null; unit: string } | null;
    };
  }>;
  /** Present on create-receipt response when vendor-bills is enabled */
  vendorBill?: GoodsReceiptVendorBillRef | null;
  vendorBillError?: string | null;
}

export type GoodsReceiptsListPayload = {
  items: GoodsReceiptListItem[];
  meta: PaginationMeta;
};

export type PurchaseOrdersListResponse = ApiEnvelope<PurchaseOrdersListPayload>;
export type PurchaseOrderDetailResponse = ApiEnvelope<PurchaseOrderDetail>;
