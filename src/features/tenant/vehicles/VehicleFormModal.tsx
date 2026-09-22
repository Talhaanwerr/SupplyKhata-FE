"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
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
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { VEHICLES_QUERY_KEY } from "@/constants/query-keys";
import type { Vehicle, VehicleStatus } from "@/types/vehicles";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  plateNumber: z.string().max(40).optional(),
  type: z.string().max(60).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type FormValues = z.infer<typeof schema>;

interface VehicleFormModalProps {
  open: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
}

export function VehicleFormModal({ open, onClose, vehicle }: VehicleFormModalProps) {
  const isEdit = !!vehicle;
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      plateNumber: "",
      type: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (vehicle) {
      reset({
        name: vehicle.name,
        plateNumber: vehicle.plateNumber ?? "",
        type: vehicle.type ?? "",
        status: vehicle.status,
      });
    } else {
      reset({
        name: "",
        plateNumber: "",
        type: "",
        status: "ACTIVE",
      });
    }
  }, [open, vehicle, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const payload = {
        name: values.name.trim(),
        plateNumber: values.plateNumber?.trim() || null,
        type: values.type?.trim() || null,
        status: values.status as VehicleStatus,
      };
      if (isEdit && vehicle) {
        return vehiclesApi.update(vehicle.id, payload);
      }
      return vehiclesApi.create(payload);
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
        toast({
          title: isEdit ? "Vehicle updated" : "Vehicle created",
          variant: "success",
        });
        onClose();
      },
      onError: (err) => {
        setError("root", { message: getSafeErrorMessage(err) });
      },
    }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          <DialogDescription>Loaders and delivery vehicles for this workspace.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Name" error={errors.name?.message} required>
            <Input placeholder="Loader 1" {...register("name")} />
          </FormField>

          <FormField label="Plate number" error={errors.plateNumber?.message}>
            <Input placeholder="Optional" {...register("plateNumber")} />
          </FormField>

          <FormField label="Type" error={errors.type?.message}>
            <Input placeholder="e.g. Pickup, Van" {...register("type")} />
          </FormField>

          <FormField label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
