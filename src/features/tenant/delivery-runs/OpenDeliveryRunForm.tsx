"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { deliveryRunsApi } from "@/lib/delivery-runs-api";
import { productsApi } from "@/lib/products-api";
import { refillBatchesApi } from "@/lib/refill-batches-api";
import { staffApi, type StaffMember } from "@/lib/staff-api";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import {
  DELIVERY_RUNS_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  REFILL_AVAILABLE_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
  VEHICLES_QUERY_KEY,
} from "@/constants/query-keys";
import { INT_RE, MONEY_RE, QTY_RE } from "@/lib/form-number";
import type { Product } from "@/types/products";
import { baseUnitLabel } from "@/types/products";
import type { RefillBatch } from "@/types/refill-batches";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { Vehicle } from "@/types/vehicles";

/** Stable fallbacks — `?? []` in render recreates arrays every time and loops reset. */
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_RIDERS: StaffMember[] = [];
const EMPTY_VEHICLES: Vehicle[] = [];

const stockSchema = z.object({
  productId: z.string().min(1),
  filledCount: z.string().regex(QTY_RE, "Units must be a non-negative number (max 3 decimals)"),
  emptyCount: z.string().regex(INT_RE, "Empty cans must be a whole number"),
  refillBatchId: z.string().optional(),
});

const schema = z.object({
  riderId: z.string().min(1, "Rider is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  date: z.string().min(1, "Date is required"),
  openingCash: z
    .string()
    .min(1, "Opening cash is required")
    .regex(MONEY_RE, "Opening cash can have at most 2 decimal places"),
  notes: z.string().max(500).optional(),
  openingStock: z.array(stockSchema).min(1, "At least one product is required"),
});

type FormValues = z.infer<typeof schema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function OpenDeliveryRunForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: containersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS);
  const [loadFromBatchState, setLoadFromBatchState] = useState<{
    productIdsKey: string;
    flags: Record<number, boolean>;
  }>({ productIdsKey: "", flags: {} });

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "active-for-delivery-runs"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "open-run"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
  });
  const vehiclesQuery = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, "active-for-delivery-runs"],
    queryFn: () => vehiclesApi.list({ status: "ACTIVE", limit: 100 }),
  });

  const products = productsQuery.data?.data ?? EMPTY_PRODUCTS;
  const riders = ridersQuery.data?.data?.items ?? EMPTY_RIDERS;
  const vehicles = vehiclesQuery.data?.data?.items ?? EMPTY_VEHICLES;
  const productIdsKey = products.map((p) => p.id).join(",");
  const loadFromBatch =
    loadFromBatchState.productIdsKey === productIdsKey ? loadFromBatchState.flags : {};

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      riderId: "",
      vehicleId: "",
      date: today(),
      openingCash: "0",
      notes: "",
      openingStock: [],
    },
  });

  const openingStock = useWatch({ control, name: "openingStock" }) ?? [];

  const availableQueries = useQueries({
    queries: products.map((product) => ({
      queryKey: [REFILL_AVAILABLE_QUERY_KEY, product.id],
      queryFn: () => refillBatchesApi.available(product.id),
      enabled: products.length > 0,
    })),
  });

  const availableByProduct = products.reduce<Record<string, RefillBatch[]>>((acc, product, i) => {
    acc[product.id] = availableQueries[i]?.data?.data ?? [];
    return acc;
  }, {});

  const riderIdsKey = riders.map((r) => r.id).join(",");
  const vehicleIdsKey = vehicles.map((v) => v.id).join(",");

  useEffect(() => {
    if (!products.length) return;
    reset((current) => ({
      ...current,
      openingStock: products.map((product) => ({
        productId: product.id,
        filledCount: "0",
        emptyCount: "0",
        refillBatchId: "",
      })),
    }));
    // Only re-seed when the product set changes — not on query refetch array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- products via productIdsKey
  }, [productIdsKey, reset]);

  useEffect(() => {
    if (riders.length === 1) {
      setValue("riderId", riders[0].id, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- riders via riderIdsKey
  }, [riderIdsKey, setValue]);

  useEffect(() => {
    if (vehicles.length === 1) {
      setValue("vehicleId", vehicles[0].id, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vehicles via vehicleIdsKey
  }, [vehicleIdsKey, setValue]);

  const applyBatch = (index: number, batchId: string) => {
    const productId = openingStock[index]?.productId;
    if (!productId) return;
    const batch = (availableByProduct[productId] ?? []).find((b) => b.id === batchId);
    setValue(`openingStock.${index}.refillBatchId`, batchId, { shouldValidate: true });
    if (batch) {
      setValue(`openingStock.${index}.filledCount`, String(batch.remainingCount), {
        shouldValidate: true,
      });
    }
    clearErrors("root");
  };

  const save = useApiMutation(
    (values: FormValues) => {
      const refillLoads = values.openingStock
        .filter((stock) => stock.refillBatchId && Number(stock.filledCount) > 0)
        .map((stock) => ({
          refillBatchId: stock.refillBatchId as string,
          productId: stock.productId,
          quantityLoaded: Number(stock.filledCount),
        }));

      return deliveryRunsApi.create({
        riderId: values.riderId,
        vehicleId: values.vehicleId,
        date: values.date,
        openingCash: Number(values.openingCash),
        notes: values.notes?.trim() || null,
        openingStock: values.openingStock.map((stock) => {
          const product = products.find((p) => p.id === stock.productId);
          const allowEmpty = containersEnabled && (product?.isReturnable ?? false);
          return {
            productId: stock.productId,
            filledCount: Number(stock.filledCount),
            emptyCount: allowEmpty ? Number(stock.emptyCount) : 0,
          };
        }),
        refillLoads: refillLoads.length > 0 ? refillLoads : undefined,
      });
    },
    {
      onSuccess: (res) => {
        qc.invalidateQueries({ queryKey: [DELIVERY_RUNS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [REFILL_AVAILABLE_QUERY_KEY] });
        toast({ title: "Delivery run opened", variant: "success" });
        if (res.data) router.push(`/delivery-runs/${res.data.id}`);
      },
      onError: (err) => {
        clearErrors("root");
        setError("root", { message: getSafeErrorMessage(err) });
      },
    }
  );

  const loading = productsQuery.isLoading || ridersQuery.isLoading || vehiclesQuery.isLoading;

  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-6">
      {errors.root && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Run Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Rider" error={errors.riderId?.message} required>
            <Select {...register("riderId")}>
              <option value="">Select rider</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {`${rider.firstName} ${rider.lastName}`.trim() || rider.email}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Vehicle" error={errors.vehicleId?.message} required>
            <Select {...register("vehicleId")}>
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date" error={errors.date?.message} required>
            <Input type="date" {...register("date")} />
          </FormField>
          <FormField label="Opening cash" error={errors.openingCash?.message} required>
            <Input inputMode="decimal" placeholder="0" {...register("openingCash")} />
          </FormField>
          <FormField label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional" {...register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opening Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading products...</p>
          ) : products.length === 0 ? (
            <EmptyState title="No active products" description="Create an active product first." />
          ) : (
            <div className="space-y-3">
              {products.map((product, index) => {
                const available = availableByProduct[product.id] ?? [];
                const useBatch = !!loadFromBatch[index];
                return (
                  <div key={product.id} className="rounded-lg border border-slate-200 p-3">
                    <input type="hidden" {...register(`openingStock.${index}.productId`)} />
                    <p className="mb-3 font-medium text-slate-900">{product.name}</p>

                    <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={useBatch}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setLoadFromBatchState({
                            productIdsKey,
                            flags: { ...loadFromBatch, [index]: checked },
                          });
                          if (!checked) {
                            setValue(`openingStock.${index}.refillBatchId`, "", {
                              shouldValidate: true,
                            });
                          }
                          clearErrors("root");
                        }}
                      />
                      Load from refill batch
                    </label>

                    {useBatch && (
                      <FormField label="Refill batch" className="mb-3">
                        <Select
                          value={openingStock[index]?.refillBatchId ?? ""}
                          onChange={(e) => applyBatch(index, e.target.value)}
                        >
                          <option value="">Select batch with remaining cans</option>
                          {available.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {new Date(batch.date).toLocaleDateString()} · rem{" "}
                              {batch.remainingCount} · cost {batch.costPerUnit.toFixed(2)}
                            </option>
                          ))}
                        </Select>
                        {available.length === 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            No batches with remaining cans for this product.
                          </p>
                        )}
                      </FormField>
                    )}

                    <div
                      className={`grid gap-3 ${
                        containersEnabled && product.isReturnable ? "sm:grid-cols-2" : ""
                      }`}
                    >
                      <FormField
                        label={
                          containersEnabled && product.isReturnable && product.baseUnit === "PCS"
                            ? "Filled cans"
                            : `Units loaded (${baseUnitLabel(product.baseUnit ?? "PCS")})`
                        }
                        error={errors.openingStock?.[index]?.filledCount?.message}
                      >
                        <Input
                          inputMode={product.allowFractionalQty ? "decimal" : "numeric"}
                          {...register(`openingStock.${index}.filledCount`, {
                            onChange: () => clearErrors("root"),
                          })}
                        />
                      </FormField>
                      {containersEnabled && product.isReturnable && (
                        <FormField
                          label="Empty cans"
                          error={errors.openingStock?.[index]?.emptyCount?.message}
                        >
                          <Input
                            inputMode="numeric"
                            {...register(`openingStock.${index}.emptyCount`)}
                          />
                        </FormField>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/delivery-runs")}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || isSubmitting || save.isPending || products.length === 0}
        >
          {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
          Open Run
        </Button>
      </div>
    </form>
  );
}
