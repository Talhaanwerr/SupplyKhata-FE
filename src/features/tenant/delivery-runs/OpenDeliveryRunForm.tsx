"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { deliveryRunsApi } from "@/lib/delivery-runs-api";
import { productsApi } from "@/lib/products-api";
import { staffApi } from "@/lib/staff-api";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import {
  DELIVERY_RUNS_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
  VEHICLES_QUERY_KEY,
} from "@/constants/query-keys";
import { INT_RE, MONEY_RE } from "@/lib/form-number";

const stockSchema = z.object({
  productId: z.string().min(1),
  filledCount: z.string().regex(INT_RE, "Filled cans must be a whole number"),
  emptyCount: z.string().regex(INT_RE, "Empty cans must be a whole number"),
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

  const products = productsQuery.data?.data ?? [];
  const riders = ridersQuery.data?.data?.items ?? [];
  const vehicles = vehiclesQuery.data?.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
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

  useEffect(() => {
    reset((current) => ({
      ...current,
      openingStock: products.map((product) => ({
        productId: product.id,
        filledCount: "0",
        emptyCount: "0",
      })),
    }));
  }, [products, reset]);

  useEffect(() => {
    if (riders.length === 1) {
      setValue("riderId", riders[0].id, { shouldValidate: true });
    }
  }, [riders, setValue]);

  useEffect(() => {
    if (vehicles.length === 1) {
      setValue("vehicleId", vehicles[0].id, { shouldValidate: true });
    }
  }, [vehicles, setValue]);

  const save = useApiMutation(
    (values: FormValues) =>
      deliveryRunsApi.create({
        riderId: values.riderId,
        vehicleId: values.vehicleId,
        date: values.date,
        openingCash: Number(values.openingCash),
        notes: values.notes?.trim() || null,
        openingStock: values.openingStock.map((stock) => ({
          productId: stock.productId,
          filledCount: Number(stock.filledCount),
          emptyCount: Number(stock.emptyCount),
        })),
      }),
    {
      onSuccess: (res) => {
        qc.invalidateQueries({ queryKey: [DELIVERY_RUNS_QUERY_KEY] });
        toast({ title: "Delivery run opened", variant: "success" });
        if (res.data) router.push(`/delivery-runs/${res.data.id}`);
      },
      onError: (err) => setError("root", { message: getSafeErrorMessage(err) }),
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
              {products.map((product, index) => (
                <div key={product.id} className="rounded-lg border border-slate-200 p-3">
                  <input type="hidden" {...register(`openingStock.${index}.productId`)} />
                  <p className="mb-3 font-medium text-slate-900">{product.name}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      label="Filled cans"
                      error={errors.openingStock?.[index]?.filledCount?.message}
                    >
                      <Input
                        inputMode="numeric"
                        {...register(`openingStock.${index}.filledCount`)}
                      />
                    </FormField>
                    <FormField
                      label="Empty cans"
                      error={errors.openingStock?.[index]?.emptyCount?.message}
                    >
                      <Input
                        inputMode="numeric"
                        {...register(`openingStock.${index}.emptyCount`)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
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
