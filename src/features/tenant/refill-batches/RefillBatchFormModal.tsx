"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { refillBatchesApi } from "@/lib/refill-batches-api";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INT_RE, MONEY_RE } from "@/lib/form-number";
import { PRODUCTS_QUERY_KEY, REFILL_BATCHES_QUERY_KEY } from "@/constants/query-keys";
import type { RefillBatch } from "@/types/refill-batches";

const schema = z.object({
  productId: z.string().min(1, "Product is required"),
  date: z.string().min(1, "Date is required"),
  cansFilledCount: z
    .string()
    .regex(INT_RE, "Must be a whole number")
    .refine((v) => Number(v) >= 1, {
      message: "At least 1 can required",
    }),
  costPerUnit: z.string().regex(MONEY_RE, "Cost can have at most 2 decimal places"),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface RefillBatchFormModalProps {
  open: boolean;
  onClose: () => void;
  batch?: RefillBatch | null;
}

export function RefillBatchFormModal({ open, onClose, batch }: RefillBatchFormModalProps) {
  const isEdit = !!batch;
  const qc = useQueryClient();
  const { toast } = useToast();

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "refill-form"],
    queryFn: () => productsApi.list({ isActive: true }),
    enabled: open,
  });
  const products = productsQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: "",
      date: today(),
      cansFilledCount: "1",
      costPerUnit: "0",
      notes: "",
    },
  });

  const cansFilledCount = useWatch({ control, name: "cansFilledCount" });
  const costPerUnit = useWatch({ control, name: "costPerUnit" });
  const totalPreview = useMemo(() => {
    const cans = Number(cansFilledCount);
    const cost = Number(costPerUnit);
    if (!Number.isFinite(cans) || !Number.isFinite(cost)) return null;
    return (cans * cost).toFixed(2);
  }, [cansFilledCount, costPerUnit]);

  useEffect(() => {
    if (!open) return;
    if (batch) {
      reset({
        productId: batch.productId,
        date: batch.date.slice(0, 10),
        cansFilledCount: String(batch.cansFilledCount),
        costPerUnit: String(batch.costPerUnit),
        notes: batch.notes ?? "",
      });
    } else {
      reset({
        productId: "",
        date: today(),
        cansFilledCount: "1",
        costPerUnit: "0",
        notes: "",
      });
    }
  }, [open, batch, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const payload = {
        productId: values.productId,
        date: values.date,
        cansFilledCount: Number(values.cansFilledCount),
        costPerUnit: Number(values.costPerUnit),
        notes: values.notes?.trim() || null,
      };
      if (isEdit && batch) return refillBatchesApi.update(batch.id, payload);
      return refillBatchesApi.create(payload);
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [REFILL_BATCHES_QUERY_KEY] });
        toast({
          title: isEdit ? "Refill batch updated" : "Refill batch created",
          variant: "success",
        });
        onClose();
      },
      onError: (err) => setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Plant Fill" : "Log Plant Fill"}</DialogTitle>
          <DialogDescription>
            This cost is for plant fill / COGS reports. Delivery line cost still uses Product Cost
            History.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Product" error={errors.productId?.message} required>
            <Select {...register("productId")}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Date" error={errors.date?.message} required>
            <Input type="date" {...register("date")} />
          </FormField>

          <FormField label="Cans filled" error={errors.cansFilledCount?.message} required>
            <Input inputMode="numeric" {...register("cansFilledCount")} />
          </FormField>

          <FormField label="Cost per unit" error={errors.costPerUnit?.message} required>
            <Input inputMode="decimal" {...register("costPerUnit")} />
          </FormField>

          <p className="text-sm text-slate-600">
            Total cost: <span className="font-medium text-slate-900">{totalPreview ?? "—"}</span>
          </p>

          <FormField label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional" {...register("notes")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
