/**
 * Planned Stop types.
 * A planned stop is a single upcoming delivery instance derived from a schedule.
 * Status lifecycle: PLANNED → INCLUDED → COMPLETED | SKIPPED | FAILED | CANCELLED
 */

export type PlannedStopStatus =
  "PLANNED" | "INCLUDED" | "COMPLETED" | "SKIPPED" | "FAILED" | "CANCELLED";

export interface PlannedStopItem {
  productId: string;
  productName: string;
  /** Qty in base units. */
  quantity: number;
  baseUnit: string;
}

export interface PlannedStop {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  areaId: string | null;
  areaName: string | null;
  defaultRiderId: string | null;
  /** ISO date string — the day this stop is planned for. */
  planDate: string;
  status: PlannedStopStatus;
  /** Populated when status = INCLUDED. */
  deliveryRunId: string | null;
  items: PlannedStopItem[];
  /** Optional skip/fail reason. */
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedStopsListResponse {
  date: string;
  items: PlannedStop[];
}

export interface ListPlannedStopsParams {
  date?: string;
  status?: PlannedStopStatus;
  areaId?: string;
  riderId?: string;
  search?: string;
}

export interface CreatePlannedStopPayload {
  customerId: string;
  planDate: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface PatchPlannedStopPayload {
  planDate?: string;
  items?: Array<{ productId: string; quantity: number }>;
}

export interface SkipFailPlannedStopPayload {
  reason?: string;
}

/** Response from GET /customers/:id/delivery-context */
export interface CustomerDeliveryContext {
  upcomingPlannedStop: PlannedStop | null;
}
