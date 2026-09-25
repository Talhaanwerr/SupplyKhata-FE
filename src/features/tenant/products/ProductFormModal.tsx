"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INT_RE, parseOptionalNumber, refineNonNegativeMoney } from "@/lib/form-number";
import { PRODUCTS_QUERY_KEY, PRODUCT_DETAIL_QUERY_KEY } from "@/constants/query-keys";
import type { Product, ProductBaseUnit } from "@/types/products";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(120),
    baseUnit: z.enum(["PCS", "LTR", "KG"]),
    volume: z.string().optional(),
    unit: z.string().max(20).optional(),
    sku: z.string().max(60).optional(),
    defaultSellingPrice: z.string().min(1, "Selling price is required"),
    unitsPerPack: z.string().optional(),
    packLabel: z.string().max(40).optional(),
    containerCapacity: z.string().optional(),
    allowFractionalQty: z.boolean(),
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
    refineNonNegativeMoney(val.containerCapacity, "Container capacity", ctx, "containerCapacity");

    const packRaw = val.unitsPerPack?.trim() ?? "";
    const labelRaw = val.packLabel?.trim() ?? "";
    if (packRaw || labelRaw) {
      if (!packRaw || !labelRaw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pack label and units per pack must be set together",
          path: [packRaw ? "packLabel" : "unitsPerPack"],
        });
      } else if (!INT_RE.test(packRaw) || Number(packRaw) < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Units per pack must be a whole number ≥ 2",
          path: ["unitsPerPack"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

function defaultFractional(baseUnit: ProductBaseUnit) {
  return baseUnit === "LTR" || baseUnit === "KG";
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
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      baseUnit: "PCS",
      volume: "",
      unit: "pcs",
      sku: "",
      defaultSellingPrice: "",
      unitsPerPack: "",
      packLabel: "",
      containerCapacity: "",
      allowFractionalQty: false,
      isReturnable: true,
      containerType: "",
      isActive: true,
      initialCostPerUnit: "",
    },
  });

  const baseUnit = useWatch({ control, name: "baseUnit" });
  const allowFractionalQty = useWatch({ control, name: "allowFractionalQty" });
  const isReturnable = useWatch({ control, name: "isReturnable" });
  const isActive = useWatch({ control, name: "isActive" });

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        baseUnit: product.baseUnit ?? "PCS",
        volume: product.volume != null ? String(product.volume) : "",
        unit: product.unit ?? "pcs",
        sku: product.sku ?? "",
        defaultSellingPrice: String(product.defaultSellingPrice),
        unitsPerPack: product.unitsPerPack != null ? String(product.unitsPerPack) : "",
        packLabel: product.packLabel ?? "",
        containerCapacity:
          product.containerCapacity != null ? String(product.containerCapacity) : "",
        allowFractionalQty: product.allowFractionalQty,
        isReturnable: product.isReturnable,
        containerType: product.containerType ?? "",
        isActive: product.isActive,
        initialCostPerUnit: "",
      });
    } else {
      reset({
        name: "",
        baseUnit: "PCS",
        volume: "",
        unit: "pcs",
        sku: "",
        defaultSellingPrice: "",
        unitsPerPack: "",
        packLabel: "",
        containerCapacity: "",
        allowFractionalQty: false,
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
      const capacity = parseOptionalNumber(values.containerCapacity);
      const packRaw = values.unitsPerPack?.trim() ?? "";
      const labelRaw = values.packLabel?.trim() ?? "";
      const payload = {
        name: values.name.trim(),
        baseUnit: values.baseUnit,
        volume: volume ?? null,
        unit: values.unit?.trim() || null,
        sku: values.sku?.trim() || null,
        defaultSellingPrice: Number(values.defaultSellingPrice),
        unitsPerPack: packRaw ? Number(packRaw) : null,
        packLabel: labelRaw || null,
        containerCapacity: capacity ?? null,
        allowFractionalQty: values.allowFractionalQty,
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            Sale is always in the base unit. Carton/crate is only an input helper.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Name" error={errors.name?.message} required>
            <Input placeholder="e.g. 19L Water Can" {...register("name")} />
          </FormField>

          <FormField label="Base unit" error={errors.baseUnit?.message} required>
            <Select
              {...register("baseUnit", {
                onChange: (e) => {
                  const next = e.target.value as ProductBaseUnit;
                  setValue("allowFractionalQty", defaultFractional(next));
                  setValue("unit", next === "LTR" ? "L" : next === "KG" ? "kg" : "pcs");
                },
              })}
            >
              <option value="PCS">Piece (pcs)</option>
              <option value="LTR">Litre (L)</option>
              <option value="KG">Kilogram (kg)</option>
            </Select>
          </FormField>

          <FormField
            label="Selling price (per base unit)"
            error={errors.defaultSellingPrice?.message}
            required
          >
            <Input
              type="number"
              step="any"
              placeholder="250"
              {...register("defaultSellingPrice")}
            />
            <p className="mt-1 text-xs text-slate-500">
              Price per {baseUnit === "LTR" ? "litre" : baseUnit === "KG" ? "kg" : "piece"}
            </p>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Volume (optional)" error={errors.volume?.message}>
              <Input type="number" step="any" placeholder="19" {...register("volume")} />
            </FormField>
            <FormField label="Display unit" error={errors.unit?.message}>
              <Input placeholder="L, kg, pcs…" {...register("unit")} />
            </FormField>
          </div>

          <FormField label="SKU" error={errors.sku?.message}>
            <Input placeholder="Optional" {...register("sku")} />
          </FormField>

          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-800">Pack helper (optional)</p>
            <p className="text-xs text-slate-500">
              For cartons/crates only. Delivery can enter packs + loose; system stores pieces.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Pack label" error={errors.packLabel?.message}>
                <Input placeholder="CTN / Crate" {...register("packLabel")} />
              </FormField>
              <FormField label="Units per pack" error={errors.unitsPerPack?.message}>
                <Input inputMode="numeric" placeholder="12" {...register("unitsPerPack")} />
              </FormField>
            </div>
          </div>

          <FormField
            label="Container capacity (optional)"
            error={errors.containerCapacity?.message}
          >
            <Input type="number" step="any" placeholder="20" {...register("containerCapacity")} />
            <p className="mt-1 text-xs text-slate-500">
              e.g. 20 for a 20L returnable can — packaging size, not the sale qty.
            </p>
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
              label="Allow fractional quantity"
              checked={allowFractionalQty}
              onChange={(e) => setValue("allowFractionalQty", e.target.checked)}
            />
            <p className="text-xs text-slate-500">
              On for oil (litres) / rice (kg). Off for whole cans and bottles.
            </p>
            <Checkbox
              label="Returnable packaging"
              checked={isReturnable}
              onChange={(e) => setValue("isReturnable", e.target.checked)}
            />
            <p className="text-xs text-slate-500">
              On for water cans and returnable packaging. Off for rice/bags — no empties on
              delivery.
            </p>
            <FormField label="Container type" error={errors.containerType?.message}>
              <Input
                placeholder="Optional (for returnable packaging)"
                {...register("containerType")}
              />
            </FormField>
            <Checkbox
              label="Active"
              checked={isActive}
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
