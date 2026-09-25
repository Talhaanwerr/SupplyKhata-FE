import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type { DeliverySchedule, UpsertDeliverySchedulePayload } from "@/types/delivery-schedule";

export const deliverySchedulesApi = {
  get: (customerId: string) =>
    apiClient.get<ApiEnvelope<DeliverySchedule | null>>(
      `/customers/${customerId}/delivery-schedule`
    ),

  upsert: (customerId: string, payload: UpsertDeliverySchedulePayload) =>
    apiClient.put<ApiEnvelope<DeliverySchedule>>(
      `/customers/${customerId}/delivery-schedule`,
      payload
    ),
};
