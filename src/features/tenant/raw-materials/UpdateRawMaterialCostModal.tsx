"use client";

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
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { refineNonNegativeMoney } from "@/lib/form-number";
import {
  RAW_MATERIAL_COSTS_QUERY_KEY,
  RAW_MATERIAL_DETAIL_QUERY_KEY,
  RAW_MATERIALS_QUERY_KEY,
} from "@/constants/query-keys";

const schema = z
  .object({
    costPerUnit: z.string().min(1, "Cost is required"),
    effectiveFrom: z.string().min(1, "Effective date is required"),
    notes: z.string().max(191).optional(),
  })
  .superRefine((val, ctx) => {
    refineNonNegativeMoney(val.costPerUnit, "Cost", ctx, "costPerUnit", {
      required: true,
    });
  });

type FormValues = z.infer<typeof schema>;

interface UpdateRawMaterialCostModalProps {
  open: boolean;
  onClose: () => void;
  rawMaterialId: string;
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function UpdateRawMaterialCostModal({
  open,
  onClose,
  rawMaterialId,
}: UpdateRawMaterialCostModalProps) {
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
      costPerUnit: "",
      effectiveFrom: todayIsoDate(),
      notes: "",
    },
  });

  const save = useApiMutation(
    (values: FormValues) =>
      rawMaterialsApi.addCost(rawMaterialId, {
        costPerUnit: Number(values.costPerUnit),
        effectiveFrom: values.effectiveFrom,
        notes: values.notes?.trim() || null,
      }),
    {
      onSuccess: async () => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: [RAW_MATERIAL_COSTS_QUERY_KEY, rawMaterialId] }),
          qc.invalidateQueries({ queryKey: [RAW_MATERIAL_DETAIL_QUERY_KEY, rawMaterialId] }),
          qc.invalidateQueries({ queryKey: [RAW_MATERIALS_QUERY_KEY] }),
        ]);
        toast({ title: "Cost updated", variant: "success" });
        reset({ costPerUnit: "", effectiveFrom: todayIsoDate(), notes: "" });
        onClose();
      },
      onError: (err) => {
        setError("root", { message: getSafeErrorMessage(err) });
      },
    }
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset({ costPerUnit: "", effectiveFrom: todayIsoDate(), notes: "" });
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Cost</DialogTitle>
          <DialogDescription>
            Adds a new cost entry. Older records stay for history; current cost updates to the
            latest.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Cost per unit" error={errors.costPerUnit?.message} required>
            <Input type="number" step="any" placeholder="12" {...register("costPerUnit")} />
          </FormField>

          <FormField label="Effective from" error={errors.effectiveFrom?.message} required>
            <Input type="date" {...register("effectiveFrom")} />
          </FormField>

          <FormField label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional note" {...register("notes")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Cost
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
