/**
 * Delivery Schedule types.
 * A schedule defines a recurring delivery cadence (every N days) for a customer,
 * with default quantities per product in base units.
 */

export interface DeliveryScheduleItem {
  productId: string;
  productName: string;
  /** Default quantity in base units (same type as DeliveryItem.quantityDelivered). */
  defaultQuantity: number;
  baseUnit: string;
}

export interface DeliverySchedule {
  id: string;
  customerId: string;
  /** Delivery every N days. 1 = daily, 2 = every other day, etc. */
  intervalDays: number;
  isActive: boolean;
  /** Optional anchor/start date (ISO date string). */
  startDate: string | null;
  items: DeliveryScheduleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDeliverySchedulePayload {
  intervalDays: number;
  isActive: boolean;
  startDate?: string | null;
  items: Array<{
    productId: string;
    defaultQuantity: number;
  }>;
}
