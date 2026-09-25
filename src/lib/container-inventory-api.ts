import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  AdjustOwnedContainersPayload,
  ContainerInventoryRow,
  SetContainerOpeningPayload,
} from "@/types/container-inventory";

export const containerInventoryApi = {
  list: () => apiClient.get<ApiEnvelope<ContainerInventoryRow[]>>("/container-inventory"),

  setOpening: (payload: SetContainerOpeningPayload) =>
    apiClient.put<ApiEnvelope<ContainerInventoryRow[]>>("/container-inventory/opening", payload),

  adjust: (payload: AdjustOwnedContainersPayload) =>
    apiClient.post<ApiEnvelope<ContainerInventoryRow[]>>(
      "/container-inventory/adjustments",
      payload
    ),
};
