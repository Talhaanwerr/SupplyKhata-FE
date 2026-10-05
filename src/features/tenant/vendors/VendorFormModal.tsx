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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { vendorsApi } from "@/lib/vendors-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { VENDOR_DETAIL_QUERY_KEY, VENDORS_QUERY_KEY } from "@/constants/query-keys";
import type { Vendor } from "@/types/vendors";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(40).optional(),
  address: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.enum(["true", "false"]),
  openingPayables: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
}

export function VendorFormModal({ open, onClose, vendor }: VendorFormModalProps) {
  const isEdit = !!vendor;
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
      phone: "",
      address: "",
      notes: "",
      isActive: "true",
      openingPayables: "0",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (vendor) {
      reset({
        name: vendor.name,
        phone: vendor.phone ?? "",
        address: vendor.address ?? "",
        notes: vendor.notes ?? "",
        isActive: vendor.isActive ? "true" : "false",
        openingPayables: "0",
      });
    } else {
      reset({
        name: "",
        phone: "",
        address: "",
        notes: "",
        isActive: "true",
        openingPayables: "0",
      });
    }
  }, [open, vendor, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const opening = Number(values.openingPayables || "0");
      const openingPayload = opening > 0 ? { openingPayables: opening } : {};
      if (isEdit && vendor) {
        return vendorsApi.update(vendor.id, {
          name: values.name.trim(),
          phone: values.phone?.trim() || null,
          address: values.address?.trim() || null,
          notes: values.notes?.trim() || null,
          isActive: values.isActive === "true",
          ...openingPayload,
        });
      }
      return vendorsApi.create({
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null,
        isActive: values.isActive === "true",
        ...openingPayload,
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
        if (vendor) {
          qc.invalidateQueries({ queryKey: [VENDOR_DETAIL_QUERY_KEY, vendor.id] });
        }
        toast({
          title: isEdit ? "Vendor updated" : "Vendor created",
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          <DialogDescription>
            Supplier contact details. Opening payables create an unpaid opening bill.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Name" error={errors.name?.message} required>
            <Input placeholder="ABC Supplies" {...register("name")} />
          </FormField>

          <FormField label="Phone" error={errors.phone?.message}>
            <Input placeholder="+92 300 1234567" {...register("phone")} />
          </FormField>

          <FormField label="Address" error={errors.address?.message}>
            <Input placeholder="Optional" {...register("address")} />
          </FormField>

          <FormField label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional" {...register("notes")} />
          </FormField>

          <FormField label="Opening payables" error={errors.openingPayables?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              {...register("openingPayables")}
            />
            {isEdit ? (
              <p className="mt-1 text-xs text-slate-500">
                Enter an amount only to add a new opening payable bill. Leave 0 to skip.
              </p>
            ) : null}
          </FormField>

          {isEdit && (
            <FormField label="Status" error={errors.isActive?.message}>
              <Select {...register("isActive")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </FormField>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
