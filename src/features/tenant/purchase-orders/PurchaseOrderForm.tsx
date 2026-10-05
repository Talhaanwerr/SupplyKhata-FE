"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { purchaseOrdersApi } from "@/lib/purchase-orders-api";
import { vendorsApi } from "@/lib/vendors-api";
import { productsApi } from "@/lib/products-api";
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import {
  PRODUCTS_QUERY_KEY,
  RAW_MATERIALS_QUERY_KEY,
  VENDORS_QUERY_KEY,
} from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { PurchaseOrderDetail, PurchaseOrderLineInput } from "@/types/purchase-orders";

type LineDraft = {
  key: string;
  kind: "product" | "raw";
  itemId: string;
  qtyOrdered: string;
  unitCost: string;
};

type FormValues = {
  vendorId: string;
  expectedDate: string;
  notes: string;
};

function newLine(): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    kind: "product",
    itemId: "",
    qtyOrdered: "1",
    unitCost: "0",
  };
}

function formatCost(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  // Trim trailing zeros for cleaner inputs (e.g. 12 → "12", 12.5 → "12.5")
  return String(Number(value));
}

function linesFromExisting(existing: PurchaseOrderDetail): LineDraft[] {
  return existing.lines.map((l) => ({
    key: l.id,
    kind: l.productId ? "product" : "raw",
    itemId: l.productId || l.rawMaterialId || "",
    qtyOrdered: String(l.qtyOrdered),
    unitCost: String(l.unitCost),
  }));
}

export function PurchaseOrderForm({ existing }: { existing?: PurchaseOrderDetail | null }) {
  const isEdit = !!existing;
  const router = useRouter();
  const { toast } = useToast();
  const { enabled: rawEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RAW_MATERIALS);
  const [lines, setLines] = useState<LineDraft[]>(() =>
    existing?.lines?.length ? linesFromExisting(existing) : [newLine()]
  );
  const [rootError, setRootError] = useState("");

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      vendorId: existing?.vendorId ?? "",
      expectedDate: existing?.expectedDate ? existing.expectedDate.slice(0, 10) : "",
      notes: existing?.notes ?? "",
    },
  });

  const vendorsQuery = useQuery({
    queryKey: [VENDORS_QUERY_KEY, "po-form"],
    queryFn: () => vendorsApi.list({ isActive: true, limit: 100 }),
  });
  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "po-form"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const rawQuery = useQuery({
    queryKey: [RAW_MATERIALS_QUERY_KEY, "po-form"],
    queryFn: () => rawMaterialsApi.list({ isActive: true, limit: 100 }),
    enabled: rawEnabled,
  });

  const vendors = vendorsQuery.data?.data?.items ?? [];
  const products = productsQuery.data?.data ?? [];
  const rawMaterials = rawQuery.data?.data?.items ?? [];

  // Keep RHF in sync if parent remounts with a different PO (key should usually remount).
  useEffect(() => {
    if (!existing) return;
    reset({
      vendorId: existing.vendorId,
      expectedDate: existing.expectedDate ? existing.expectedDate.slice(0, 10) : "",
      notes: existing.notes ?? "",
    });
  }, [existing, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const payloadLines: PurchaseOrderLineInput[] = lines.map((l) => {
        if (!l.itemId) throw new Error("Select a product or raw material on every line");
        const qty = Number(l.qtyOrdered);
        const cost = Number(l.unitCost);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("Invalid quantity");
        if (!Number.isFinite(cost) || cost < 0) throw new Error("Invalid unit cost");
        return {
          productId: l.kind === "product" ? l.itemId : null,
          rawMaterialId: l.kind === "raw" ? l.itemId : null,
          qtyOrdered: qty,
          unitCost: cost,
        };
      });

      const payload = {
        vendorId: values.vendorId,
        expectedDate: values.expectedDate || null,
        notes: values.notes?.trim() || null,
        lines: payloadLines,
      };

      if (isEdit && existing) {
        return purchaseOrdersApi.update(existing.id, payload);
      }
      return purchaseOrdersApi.create(payload);
    },
    {
      onSuccess: (res) => {
        toast({
          title: isEdit ? "Purchase order updated" : "Purchase order created",
          variant: "success",
        });
        if (res.data?.id) router.push(`/purchase-orders/${res.data.id}`);
      },
      onError: (err) => setRootError(getSafeErrorMessage(err)),
    }
  );

  const onSubmit = handleSubmit(async (values) => {
    setRootError("");
    try {
      await save.mutateAsync(values);
    } catch (err) {
      if (err instanceof Error && !save.isError) {
        setRootError(err.message);
      }
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      {rootError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rootError}</p>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <FormField label="Vendor" required>
          <Select {...register("vendorId", { required: true })}>
            <option value="">Select vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Expected date">
          <Input type="date" {...register("expectedDate")} />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <Input placeholder="Optional" {...register("notes")} />
        </FormField>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Lines</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((p) => [...p, newLine()])}
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        </div>

        <div className="space-y-3">
          <div className="hidden gap-2 px-3 text-xs font-medium text-slate-500 sm:grid sm:grid-cols-[110px_1fr_100px_100px_40px]">
            <span>Type</span>
            <span>Item</span>
            <span>Qty</span>
            <span>Unit cost</span>
            <span className="sr-only">Remove</span>
          </div>
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[110px_1fr_100px_100px_40px]"
            >
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 sm:hidden">Type</span>
                <Select
                  value={line.kind}
                  onChange={(e) => {
                    const kind = e.target.value as "product" | "raw";
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, kind, itemId: "", unitCost: "0" } : l
                      )
                    );
                  }}
                >
                  <option value="product">Product</option>
                  {rawEnabled && <option value="raw">Raw material</option>}
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 sm:hidden">Item</span>
                <Select
                  value={line.itemId}
                  onChange={(e) => {
                    const itemId = e.target.value;
                    let unitCost = "0";
                    if (itemId) {
                      if (line.kind === "raw") {
                        const raw = rawMaterials.find((r) => r.id === itemId);
                        unitCost = formatCost(raw?.defaultCost);
                      } else {
                        const product = products.find((p) => p.id === itemId);
                        unitCost = formatCost(product?.currentCost);
                      }
                    }
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, itemId, unitCost } : l))
                    );
                  }}
                >
                  <option value="">Select…</option>
                  {line.kind === "product"
                    ? products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    : rawMaterials.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.unit})
                        </option>
                      ))}
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 sm:hidden">Qty</span>
                <Input
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="Qty"
                  aria-label="Quantity ordered"
                  value={line.qtyOrdered}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, qtyOrdered: e.target.value } : l))
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 sm:hidden">Unit cost</span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Unit cost"
                  aria-label="Unit cost"
                  value={line.unitCost}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, unitCost: e.target.value } : l))
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={lines.length <= 1}
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remove line"
                className="sm:self-end"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save draft" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
