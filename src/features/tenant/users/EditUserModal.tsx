"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { usersApi } from "@/lib/users-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { USERS_QUERY_KEY } from "@/constants/query-keys";
import type { UserListItem } from "@/types/users";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  timezone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface EditUserModalProps {
  user: UserListItem | null;
  open: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, open, onClose }: EditUserModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        timezone: user.timezone ?? "",
      });
    }
  }, [user, reset]);

  const update = useApiMutation((values: FormValues) => usersApi.update(user!.id, values), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({ title: "User updated", variant: "success" });
      onClose();
    },
    onError: (err) => {
      setError("root", { message: getSafeErrorMessage(err) });
    },
  });

  async function onSubmit(data: FormValues) {
    await update.mutateAsync(data);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" error={errors.firstName?.message} required>
              <Input {...register("firstName")} />
            </FormField>
            <FormField label="Last Name" error={errors.lastName?.message} required>
              <Input {...register("lastName")} />
            </FormField>
          </div>

          <FormField label="Timezone" error={errors.timezone?.message}>
            <Input placeholder="UTC" {...register("timezone")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || update.isPending}>
              {(isSubmitting || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
