"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/users-api";
import { useApiMutation } from "./use-api-mutation";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { USERS_QUERY_KEY, USER_DETAIL_QUERY_KEY } from "@/constants/query-keys";

interface UseUserStatusMutationOptions {
  /** Called after success OR error so the caller can close dialogs / reset state. */
  onSettled?: () => void;
}

/**
 * Shared hook for deactivating and reactivating a user.
 * Handles cache invalidation and error toasts so callers don't repeat this logic.
 *
 * Usage:
 *   const { deactivate, reactivate, isActing } = useUserStatusMutation(userId, {
 *     onSettled: () => setConfirmUser(null),
 *   });
 *   // then: deactivate.mutate() / reactivate.mutate()
 */
export function useUserStatusMutation(
  userId: string | null | undefined,
  options?: UseUserStatusMutationOptions
) {
  const qc = useQueryClient();
  const { toast } = useToast();

  function invalidate() {
    qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    if (userId) {
      qc.invalidateQueries({ queryKey: [USER_DETAIL_QUERY_KEY, userId] });
    }
  }

  // TanStack Query requires a variable argument even for void mutations.
  // We accept `_?: void` so callers can use `.mutate()` without passing undefined explicitly.
  const deactivateMutation = useApiMutation((_?: void) => usersApi.deactivate(userId!), {
    onSuccess: () => {
      invalidate();
      options?.onSettled?.();
    },
    onError: (err) => {
      toast({
        title: "Could not deactivate user",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      options?.onSettled?.();
    },
  });

  const reactivateMutation = useApiMutation((_?: void) => usersApi.reactivate(userId!), {
    onSuccess: () => {
      invalidate();
      options?.onSettled?.();
    },
    onError: (err) => {
      toast({
        title: "Could not reactivate user",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      options?.onSettled?.();
    },
  });

  return {
    deactivate: deactivateMutation,
    reactivate: reactivateMutation,
    isActing: deactivateMutation.isPending || reactivateMutation.isPending,
  };
}
