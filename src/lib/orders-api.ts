import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CancelOrderPayload,
  CreateOrderPayload,
  DeliverOrderPayload,
  ListOrdersParams,
  OrderDetail,
  OrdersListPayload,
  OrderTimelineEvent,
  RecordOrderPaymentPayload,
  RefundOrderPayload,
  ReplaceOrderItemsPayload,
  UpdateOrderPayload,
} from "@/types/orders";

function buildQuery(params?: ListOrdersParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.status) q.set("status", params.status);
  if (params.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.search) q.set("search", params.search);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const ordersApi = {
  list: (params?: ListOrdersParams) =>
    apiClient.get<ApiEnvelope<OrdersListPayload>>(`/orders${buildQuery(params)}`),

  get: (id: string) => apiClient.get<ApiEnvelope<OrderDetail>>(`/orders/${id}`),

  create: (payload: CreateOrderPayload) =>
    apiClient.post<ApiEnvelope<OrderDetail>>("/orders", payload),

  update: (id: string, payload: UpdateOrderPayload) =>
    apiClient.patch<ApiEnvelope<OrderDetail>>(`/orders/${id}`, payload),

  replaceItems: (id: string, payload: ReplaceOrderItemsPayload) =>
    apiClient.put<ApiEnvelope<OrderDetail>>(`/orders/${id}/items`, payload),

  place: (id: string) => apiClient.post<ApiEnvelope<OrderDetail>>(`/orders/${id}/place`),

  ship: (id: string) => apiClient.post<ApiEnvelope<OrderDetail>>(`/orders/${id}/ship`),

  deliver: (id: string, payload: DeliverOrderPayload) =>
    apiClient.post<ApiEnvelope<OrderDetail>>(`/orders/${id}/deliver`, payload),

  cancel: (id: string, payload: CancelOrderPayload) =>
    apiClient.post<ApiEnvelope<OrderDetail>>(`/orders/${id}/cancel`, payload),

  payment: (id: string, payload: RecordOrderPaymentPayload) =>
    apiClient.post<ApiEnvelope<OrderDetail>>(`/orders/${id}/payments`, payload),

  refund: (id: string, payload: RefundOrderPayload) =>
    apiClient.post<ApiEnvelope<OrderDetail>>(`/orders/${id}/refund`, payload),

  timeline: (id: string) =>
    apiClient.get<ApiEnvelope<OrderTimelineEvent[]>>(`/orders/${id}/timeline`),
};
