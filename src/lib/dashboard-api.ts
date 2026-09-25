import { apiClient } from "./api-client";
import type { DashboardResponse } from "@/types/dashboard";

export const dashboardApi = {
  get: (date?: string) =>
    apiClient.get<DashboardResponse>("/dashboard", {
      params: date ? { date } : undefined,
    }),
};
