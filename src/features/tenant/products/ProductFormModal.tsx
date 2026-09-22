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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { parseOptionalNumber, refineNonNegativeMoney } from "@/lib/form-number";
import { PRODUCTS_QUERY_KEY, PRODUCT_DETAIL_QUERY_KEY } from "@/constants/query-keys";
import type { Product } from "@/types/products";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(120),
    volume: z.string().optional(),
    unit: z.string().max(20).optional(),
    sku: z.string().max(60).optional(),
    defaultSellingPrice: z.string().min(1, "Selling price is required"),
    isReturnable: z.boolean(),
    containerType: z.string().max(60).optional(),
    isActive: z.boolean(),
    initialCostPerUnit: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    refineNonNegativeMoney(val.volume, "Volume", ctx, "volume");
    refineNonNegativeMoney(val.defaultSellingPrice, "Selling price", ctx, "defaultSellingPrice", {
      required: true,
    });
    refineNonNegativeMoney(val.initialCostPerUnit, "Initial cost", ctx, "initialCostPerUnit");
  });

type FormValues = z.infer<typeof schema>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const isEdit = !!product;
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      volume: "",
      unit: "L",
      sku: "",
      defaultSellingPrice: "",
      isReturnable: true,
      containerType: "",
      isActive: true,
      initialCostPerUnit: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        volume: product.volume != null ? String(product.volume) : "",
        unit: product.unit ?? "L",
        sku: product.sku ?? "",
        defaultSellingPrice: String(product.defaultSellingPrice),
        isReturnable: product.isReturnable,
        containerType: product.containerType ?? "",
        isActive: product.isActive,
        initialCostPerUnit: "",
      });
    } else {
      reset({
        name: "",
        volume: "",
        unit: "L",
        sku: "",
        defaultSellingPrice: "",
        isReturnable: true,
        containerType: "",
        isActive: true,
        initialCostPerUnit: "",
      });
    }
  }, [open, product, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const volume = parseOptionalNumber(values.volume);
      const payload = {
        name: values.name.trim(),
        volume: volume ?? null,
        unit: values.unit?.trim() || "L",
        sku: values.sku?.trim() || null,
        defaultSellingPrice: Number(values.defaultSellingPrice),
        isReturnable: values.isReturnable,
        containerType: values.containerType?.trim() || null,
        isActive: values.isActive,
      };

      if (isEdit && product) {
        return productsApi.update(product.id, payload);
      }

      const initialCost = parseOptionalNumber(values.initialCostPerUnit);
      return productsApi.create({
        ...payload,
        ...(initialCost !== undefined ? { initialCostPerUnit: initialCost } : {}),
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
        if (product) {
          qc.invalidateQueries({ queryKey: [PRODUCT_DETAIL_QUERY_KEY, product.id] });
        }
        toast({
          title: isEdit ? "Product updated" : "Product created",
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
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            Create a product with selling price and optional cost.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Name" error={errors.name?.message} required>
            <Input placeholder="e.g. Full Cream Milk 1L" {...register("name")} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Volume" error={errors.volume?.message}>
              <Input type="number" step="any" placeholder="1" {...register("volume")} />
            </FormField>
            <FormField label="Unit" error={errors.unit?.message}>
              <Input placeholder="L, kg, pcs…" {...register("unit")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Default Selling Price"
              error={errors.defaultSellingPrice?.message}
              required
            >
              <Input
                type="number"
                step="any"
                placeholder="250"
                {...register("defaultSellingPrice")}
              />
            </FormField>
            <FormField label="SKU" error={errors.sku?.message}>
              <Input placeholder="Optional" {...register("sku")} />
            </FormField>
          </div>

          <FormField label="Container Type" error={errors.containerType?.message}>
            <Input
              placeholder="Optional (for returnable packaging)"
              {...register("containerType")}
            />
          </FormField>

          {!isEdit && (
            <FormField label="Initial Cost (optional)" error={errors.initialCostPerUnit?.message}>
              <Input
                type="number"
                step="any"
                placeholder="180"
                {...register("initialCostPerUnit")}
              />
            </FormField>
          )}

          <div className="space-y-2 pt-1">
            <Checkbox
              label="Returnable packaging"
              checked={watch("isReturnable")}
              onChange={(e) => setValue("isReturnable", e.target.checked)}
            />
            <Checkbox
              label="Active"
              checked={watch("isActive")}
              onChange={(e) => setValue("isActive", e.target.checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
