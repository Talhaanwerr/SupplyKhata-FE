import type { PaymentMethod } from "./delivery";

export type OrderStatus =
  "DRAFT" | "PLACED" | "SHIPPED" | "PARTIALLY_DELIVERED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export type OrderPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface OrderCustomerRef {
  id: string;
  name: string;
  phone: string;
}

export interface OrderUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface OrderItemProduct {
  id: string;
  name: string;
  sku: string | null;
  baseUnit: string;
  allowFractionalQty: boolean;
  isReturnable: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  quantityDelivered: number;
  containersDelivered: number;
  emptiesReceived: number;
  unitPriceSnapshot: number;
  costSnapshot: number | null;
  lineDiscount: number;
  lineTotal: number;
  product: OrderItemProduct;
}

export interface OrderPaymentRow {
  id: string;
  paymentId: string | null;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  createdById: string | null;
  createdAt: string;
}

export interface OrderListItem {
  id: string;
  tenantId: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  orderNumber: number;
  subtotal: number;
  discountTotal: number;
  deliveryCharges: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  preferredShipDate: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomerRef;
  createdBy: OrderUserRef;
}

export interface OrderDetail {
  id: string;
  tenantId: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  orderNumber: number;
  subtotal: number;
  discountTotal: number;
  deliveryCharges: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  shippingAddress: string | null;
  shippingNotes: string | null;
  internalNotes: string | null;
  preferredShipDate: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  refundReason: string | null;
  refundedAt: string | null;
  refundedById: string | null;
  refundAmount: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomerRef;
  createdBy: OrderUserRef;
  cancelledBy: OrderUserRef | null;
  refundedBy: OrderUserRef | null;
  items: OrderItem[];
  payments: OrderPaymentRow[];
}

export interface OrderTimelineEvent {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  at: string;
  note: string | null;
  by: OrderUserRef | null;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  lineDiscount?: number;
  containersDelivered?: number;
}

export interface CreateOrderPayload {
  customerId: string;
  items: OrderItemInput[];
  discountTotal?: number;
  deliveryCharges?: number;
  shippingAddress?: string | null;
  shippingNotes?: string | null;
  internalNotes?: string | null;
  preferredShipDate?: string | null;
}

export interface UpdateOrderPayload {
  discountTotal?: number;
  deliveryCharges?: number;
  shippingAddress?: string | null;
  shippingNotes?: string | null;
  internalNotes?: string | null;
  preferredShipDate?: string | null;
}

export interface ReplaceOrderItemsPayload {
  items: OrderItemInput[];
}

export interface DeliverOrderPayload {
  items: Array<{
    productId: string;
    quantityDelivered: number;
    containersDelivered?: number;
    emptiesReceived?: number;
  }>;
}

export interface CancelOrderPayload {
  reason: string;
}

export interface RecordOrderPaymentPayload {
  method: PaymentMethod;
  amount: number;
}

export interface RefundOrderPayload {
  amount: number;
  reason: string;
}

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  customerId?: string;
  search?: string;
}

export interface OrdersListPayload {
  items: OrderListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const ORDER_STATUSES: OrderStatus[] = [
  "DRAFT",
  "PLACED",
  "SHIPPED",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export const ORDER_PAYMENT_STATUSES: OrderPaymentStatus[] = ["UNPAID", "PARTIALLY_PAID", "PAID"];
