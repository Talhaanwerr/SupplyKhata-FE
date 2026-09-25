import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  PlannedStop,
  PlannedStopsListResponse,
  ListPlannedStopsParams,
  CreatePlannedStopPayload,
  PatchPlannedStopPayload,
  SkipFailPlannedStopPayload,
  CustomerDeliveryContext,
} from "@/types/planned-stops";

function qs(params: Record<string, string | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Normalize BE plannedQuantity → FE quantity. */
function mapStop(raw: Record<string, unknown>): PlannedStop {
  const items = Array.isArray(raw.items)
    ? (raw.items as Array<Record<string, unknown>>).map((item) => ({
        productId: String(item.productId),
        productName: String(item.productName ?? ""),
        quantity: Number(item.plannedQuantity ?? item.quantity ?? 0),
        baseUnit: String(item.baseUnit ?? "PCS"),
      }))
    : [];
  return {
    id: String(raw.id),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ""),
    customerPhone: String(raw.customerPhone ?? ""),
    areaId: (raw.areaId as string | null) ?? null,
    areaName: (raw.areaName as string | null) ?? null,
    defaultRiderId: (raw.defaultRiderId as string | null) ?? null,
    planDate: String(raw.planDate),
    status: raw.status as PlannedStop["status"],
    deliveryRunId: (raw.deliveryRunId as string | null) ?? null,
    items,
    reason: (raw.skipReason as string | null) ?? (raw.failReason as string | null) ?? null,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export const plannedStopsApi = {
  list: async (params: ListPlannedStopsParams) => {
    const res = await apiClient.get<
      ApiEnvelope<{ date: string; items: Record<string, unknown>[] }>
    >(
      `/planned-stops${qs({
        date: params.date,
        status: params.status,
        areaId: params.areaId,
        riderId: params.riderId,
        search: params.search,
      })}`
    );
    return {
      ...res,
      data: {
        date: res.data?.date ?? params.date ?? "",
        items: (res.data?.items ?? []).map(mapStop),
      } satisfies PlannedStopsListResponse,
    };
  },

  create: async (payload: CreatePlannedStopPayload) => {
    const res = await apiClient.post<ApiEnvelope<Record<string, unknown>>>("/planned-stops", {
      customerId: payload.customerId,
      planDate: payload.planDate,
      items: payload.items.map((i) => ({
        productId: i.productId,
        plannedQuantity: i.quantity,
      })),
    });
    return { ...res, data: res.data ? mapStop(res.data) : null };
  },

  patch: async (id: string, payload: PatchPlannedStopPayload) => {
    const res = await apiClient.patch<ApiEnvelope<Record<string, unknown>>>(
      `/planned-stops/${id}`,
      {
        planDate: payload.planDate,
        items: payload.items?.map((i) => ({
          productId: i.productId,
          plannedQuantity: i.quantity,
        })),
      }
    );
    return { ...res, data: res.data ? mapStop(res.data) : null };
  },

  skip: async (id: string, payload: SkipFailPlannedStopPayload = {}) => {
    const res = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      `/planned-stops/${id}/skip`,
      payload
    );
    return { ...res, data: res.data ? mapStop(res.data) : null };
  },

  fail: async (id: string, payload: SkipFailPlannedStopPayload = {}) => {
    const res = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      `/planned-stops/${id}/fail`,
      payload
    );
    return { ...res, data: res.data ? mapStop(res.data) : null };
  },

  deliveryContext: async (customerId: string) => {
    const res = await apiClient.get<
      ApiEnvelope<{ upcomingPlannedStop: Record<string, unknown> | null }>
    >(`/customers/${customerId}/delivery-context`);
    const ctx: CustomerDeliveryContext = {
      upcomingPlannedStop: res.data?.upcomingPlannedStop
        ? mapStop(res.data.upcomingPlannedStop)
        : null,
    };
    return { ...res, data: ctx };
  },

  includeInRun: (runId: string, plannedStopIds: string[]) =>
    apiClient.post<ApiEnvelope<{ items: unknown[] }>>(
      `/delivery-runs/${runId}/include-planned-stops`,
      { plannedStopIds }
    ),
};
