"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/lib/api-error";
import type { PaginationParams } from "@/types";
import type { ApiEnvelope, PaginatedPayload } from "@/types/api";

interface UsePaginatedQueryOptions<T> extends Omit<
  UseQueryOptions<ApiEnvelope<PaginatedPayload<T>>, ApiError>,
  "queryKey" | "queryFn"
> {
  queryKey: readonly unknown[];
  /** API path, e.g. "/audit-logs" */
  path: string;
  params?: PaginationParams & Record<string, unknown>;
}

/**
 * Fetches a paginated list endpoint that returns `ApiEnvelope<PaginatedPayload<T>>`.
 *
 * Access items via `data?.data?.items` and meta via `data?.data?.meta`.
 *
 * Usage:
 *   const { data, isLoading } = usePaginatedQuery<AuditLogItem>({
 *     queryKey: [AUDIT_LOGS_QUERY_KEY, page, module],
 *     path: "/audit-logs",
 *     params: { page, limit: 20, module },
 *     placeholderData: (prev) => prev,
 *   });
 *   const items = data?.data?.items ?? [];
 *   const totalPages = data?.data?.meta.totalPages ?? 1;
 */
export function usePaginatedQuery<T>({
  queryKey,
  path,
  params,
  ...options
}: UsePaginatedQueryOptions<T>) {
  return useQuery<ApiEnvelope<PaginatedPayload<T>>, ApiError>({
    queryKey,
    queryFn: () =>
      apiClient.get<ApiEnvelope<PaginatedPayload<T>>>(path, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      }),
    ...options,
  });
}
