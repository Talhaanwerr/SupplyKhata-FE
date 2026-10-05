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
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import {
  RAW_MATERIAL_COSTS_QUERY_KEY,
  RAW_MATERIAL_DETAIL_QUERY_KEY,
  RAW_MATERIALS_QUERY_KEY,
} from "@/constants/query-keys";
import type { RawMaterial, RawMaterialUnit } from "@/types/raw-materials";

const UNITS: RawMaterialUnit[] = ["KG", "LTR", "PCS"];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  unit: z.enum(["KG", "LTR", "PCS"]),
  sku: z.string().max(64).optional(),
  defaultCost: z.string().optional(),
  reorderLevel: z.string().optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof schema>;

function parseOptionalNumber(raw?: string): number | null {
  const t = raw?.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

interface RawMaterialFormModalProps {
  open: boolean;
  onClose: () => void;
  rawMaterial?: RawMaterial | null;
}

export function RawMaterialFormModal({ open, onClose, rawMaterial }: RawMaterialFormModalProps) {
  const isEdit = !!rawMaterial;
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
      unit: "KG",
      sku: "",
      defaultCost: "",
      reorderLevel: "",
      notes: "",
      isActive: "true",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (rawMaterial) {
      reset({
        name: rawMaterial.name,
        unit: rawMaterial.unit,
        sku: rawMaterial.sku ?? "",
        defaultCost: rawMaterial.defaultCost != null ? String(rawMaterial.defaultCost) : "",
        reorderLevel: rawMaterial.reorderLevel != null ? String(rawMaterial.reorderLevel) : "",
        notes: rawMaterial.notes ?? "",
        isActive: rawMaterial.isActive ? "true" : "false",
      });
    } else {
      reset({
        name: "",
        unit: "KG",
        sku: "",
        defaultCost: "",
        reorderLevel: "",
        notes: "",
        isActive: "true",
      });
    }
  }, [open, rawMaterial, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const base = {
        name: values.name.trim(),
        unit: values.unit as RawMaterialUnit,
        sku: values.sku?.trim() || null,
        reorderLevel: parseOptionalNumber(values.reorderLevel),
        notes: values.notes?.trim() || null,
        isActive: values.isActive === "true",
      };
      if (isEdit && rawMaterial) {
        return rawMaterialsApi.update(rawMaterial.id, base);
      }
      return rawMaterialsApi.create({
        ...base,
        defaultCost: parseOptionalNumber(values.defaultCost),
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [RAW_MATERIALS_QUERY_KEY] });
        if (rawMaterial) {
          qc.invalidateQueries({
            queryKey: [RAW_MATERIAL_DETAIL_QUERY_KEY, rawMaterial.id],
          });
          qc.invalidateQueries({
            queryKey: [RAW_MATERIAL_COSTS_QUERY_KEY, rawMaterial.id],
          });
        }
        toast({
          title: isEdit ? "Raw material updated" : "Raw material created",
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
          <DialogTitle>{isEdit ? "Edit Raw Material" : "Add Raw Material"}</DialogTitle>
          <DialogDescription>
            Separate from finished products. Stock is tracked by warehouse location.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Name" error={errors.name?.message} required>
            <Input placeholder="PET Resin" {...register("name")} />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Unit" error={errors.unit?.message} required>
              <Select {...register("unit")}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="SKU" error={errors.sku?.message}>
              <Input placeholder="Optional" {...register("sku")} />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {!isEdit ? (
              <FormField label="Initial cost" error={errors.defaultCost?.message}>
                <Input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  {...register("defaultCost")}
                />
              </FormField>
            ) : null}
            <FormField label="Reorder level" error={errors.reorderLevel?.message}>
              <Input
                type="number"
                step="any"
                placeholder="Optional"
                {...register("reorderLevel")}
              />
            </FormField>
          </div>

          <FormField label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional" {...register("notes")} />
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
              {isEdit ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
