"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api-error";

/**
 * Thin wrapper around useMutation that types the error as ApiError.
 * Usage:
 *   const { mutate } = useApiMutation(
 *     (data) => apiClient.postOne<User>("/users", data),
 *     { onSuccess: () => queryClient.invalidateQueries(...) }
 *   )
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn">
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    ...options,
  });
}
