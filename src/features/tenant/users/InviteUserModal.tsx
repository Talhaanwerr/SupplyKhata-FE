"use client";

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
  DialogDescription,
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
import type { RoleItem } from "@/types/roles";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});
type FormValues = z.infer<typeof schema>;

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  roles?: RoleItem[];
}

export function InviteUserModal({ open, onClose, roles = [] }: InviteUserModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const invite = useApiMutation(usersApi.invite, {
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });

      const emailSent = (res?.data as unknown as { emailSent?: boolean } | undefined)?.emailSent;
      if (emailSent === false) {
        toast({
          title: "User added, but email failed",
          description:
            "The user was created but the invite email could not be sent. Check your mail configuration.",
          variant: "error",
        });
      } else {
        toast({
          title: "Invitation sent",
          description: "The user will receive an email shortly.",
          variant: "success",
        });
      }

      reset();
      onClose();
    },
    onError: (err) => {
      setError("root", { message: getSafeErrorMessage(err) });
    },
  });

  async function onSubmit(data: FormValues) {
    await invite.mutateAsync({ ...data });
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Send an invitation email with a sign-up link.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="First Name" error={errors.firstName?.message} required>
              <Input placeholder="Jane" {...register("firstName")} />
            </FormField>
            <FormField label="Last Name" error={errors.lastName?.message} required>
              <Input placeholder="Doe" {...register("lastName")} />
            </FormField>
          </div>

          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" placeholder="jane@company.com" {...register("email")} />
          </FormField>

          {roles.length > 0 && (
            <p className="text-xs text-slate-400">
              You can assign roles after the user accepts the invitation.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || invite.isPending}>
              {(isSubmitting || invite.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
