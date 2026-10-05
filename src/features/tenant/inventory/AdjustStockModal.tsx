"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
import { inventoryApi } from "@/lib/inventory-api";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INVENTORY_QUERY_KEY, PRODUCTS_QUERY_KEY } from "@/constants/query-keys";
import { pickDefaultLocationId } from "@/lib/location-default";

type FormValues = {
  locationId: string;
  productId: string;
  quantityDelta: string;
  reason: string;
};

export function AdjustStockModal({
  open,
  onClose,
  warehouseEnabled,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  warehouseEnabled: boolean;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { locationId: "", productId: "", quantityDelta: "", reason: "" },
  });

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "inventory-adjust"],
    queryFn: () => productsApi.list({ isActive: true }),
    enabled: open,
  });
  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "adjust"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
    enabled: open,
  });

  const products = productsQuery.data?.data ?? [];
  const locations = useMemo(() => locationsQuery.data?.data ?? [], [locationsQuery.data?.data]);
  const showLocationSelect = warehouseEnabled || locations.length > 1;

  useEffect(() => {
    if (!open) return;
    reset({
      locationId: pickDefaultLocationId(locations),
      productId: "",
      quantityDelta: "",
      reason: "",
    });
  }, [open, locations, reset]);

  const mutation = useApiMutation(
    (values: FormValues) =>
      inventoryApi.postAdjustment({
        locationId: showLocationSelect && values.locationId ? values.locationId : undefined,
        productId: values.productId,
        quantityDelta: Number(values.quantityDelta),
        reason: values.reason.trim(),
      }),
    {
      onSuccess: () => {
        toast({ title: "Stock adjusted", variant: "success" });
        onSuccess();
        onClose();
      },
      onError: (err) =>
        toast({
          title: "Could not adjust",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          {showLocationSelect ? (
            <FormField label="Location">
              <Select {...register("locationId")}>
                <option value="">Default location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <FormField label="Product" required>
            <Select {...register("productId", { required: true })}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quantity delta (+/−)" required>
            <Input
              type="number"
              step="any"
              placeholder="e.g. -2 or 1.5"
              {...register("quantityDelta", { required: true })}
            />
          </FormField>
          <FormField label="Reason" required>
            <Input
              placeholder="Damage, loss, found, count fix…"
              {...register("reason", { required: true })}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
