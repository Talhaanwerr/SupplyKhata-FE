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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { rolesApi } from "@/lib/roles-api";
import { ROLES_QUERY_KEY } from "@/constants/query-keys";
import type { RoleItem } from "@/types/roles";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface RoleModalProps {
  /** Pass a role to edit, undefined to create */
  role?: RoleItem | null;
  open: boolean;
  onClose: () => void;
}

export function RoleModal({ role, open, onClose }: RoleModalProps) {
  const qc = useQueryClient();
  const isEdit = !!role;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (role) {
      reset({ name: role.name, description: role.description ?? "" });
    } else {
      reset({ name: "", description: "" });
    }
  }, [role, reset]);

  const create = useApiMutation(rolesApi.create, {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      onClose();
    },
    onError: (err) => setError("root", { message: err.message }),
  });

  const update = useApiMutation((values: FormValues) => rolesApi.update(role!.id, values), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      onClose();
    },
    onError: (err) => setError("root", { message: err.message }),
  });

  async function onSubmit(data: FormValues) {
    if (isEdit) {
      await update.mutateAsync(data);
    } else {
      const slug = data.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
      await create.mutateAsync({ ...data, slug });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "Create Role"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the role name or description."
              : "Create a new custom role for your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {errors.root.message}
            </div>
          )}

          <FormField label="Role Name" error={errors.name?.message} required>
            <Input placeholder="e.g. Manager" {...register("name")} />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <Input placeholder="Optional short description" {...register("description")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {(isSubmitting || isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
