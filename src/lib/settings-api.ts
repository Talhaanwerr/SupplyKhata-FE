import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  TenantSettings,
  UpdateSettingsPayload,
  PlatformSettings,
  UpdatePlatformSettingsPayload,
} from "@/types/settings";

export const settingsApi = {
  get: () => apiClient.get<ApiEnvelope<TenantSettings>>("/settings"),

  update: (payload: UpdateSettingsPayload) =>
    apiClient.patch<ApiEnvelope<TenantSettings>>("/settings", payload),

  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return apiClient.post<ApiEnvelope<TenantSettings>>("/settings/logo", form);
  },

  clearLogo: () => apiClient.delete<ApiEnvelope<TenantSettings>>("/settings/logo"),

  getPlatform: () => apiClient.get<ApiEnvelope<PlatformSettings>>("/settings/platform"),

  updatePlatform: (payload: UpdatePlatformSettingsPayload) =>
    apiClient.patch<ApiEnvelope<PlatformSettings>>("/settings/platform", payload),

  deleteTenant: () => apiClient.delete<void>("/settings/tenant"),
};
