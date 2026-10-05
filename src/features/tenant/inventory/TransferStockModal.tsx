"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { pickDefaultLocationId } from "@/lib/location-default";
import { INVENTORY_QUERY_KEY, PRODUCTS_QUERY_KEY } from "@/constants/query-keys";

type FormValues = {
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  quantity: string;
};

export function TransferStockModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, control, setError, clearErrors, formState } =
    useForm<FormValues>({
      defaultValues: { fromLocationId: "", toLocationId: "", productId: "", quantity: "" },
    });

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "inventory-transfer"],
    queryFn: () => productsApi.list({ isActive: true }),
    enabled: open,
  });
  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "transfer"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
    enabled: open,
  });

  const products = productsQuery.data?.data ?? [];
  const locations = useMemo(() => locationsQuery.data?.data ?? [], [locationsQuery.data?.data]);

  const fromLocationId = useWatch({ control, name: "fromLocationId" }) ?? "";
  const toLocationId = useWatch({ control, name: "toLocationId" }) ?? "";
  const productId = useWatch({ control, name: "productId" }) ?? "";

  const balanceQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "balances", "transfer-avail", fromLocationId, productId],
    queryFn: () =>
      inventoryApi.listBalances({
        locationId: fromLocationId,
        productId,
        limit: 1,
      }),
    enabled: open && !!fromLocationId && !!productId,
  });

  const availableQty = useMemo(() => {
    const row = balanceQuery.data?.data?.items?.[0];
    return row?.quantity ?? 0;
  }, [balanceQuery.data?.data?.items]);

  useEffect(() => {
    if (!open) return;
    const fromId = pickDefaultLocationId(locations);
    const toId =
      locations.find((l) => l.id !== fromId)?.id ?? locations.find((l) => !l.isDefault)?.id ?? "";
    reset({
      fromLocationId: fromId,
      toLocationId: toId,
      productId: "",
      quantity: "",
    });
  }, [open, locations, reset]);

  const mutation = useApiMutation(
    (values: FormValues) =>
      inventoryApi.postTransfer({
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        productId: values.productId,
        quantity: Number(values.quantity),
      }),
    {
      onSuccess: () => {
        toast({ title: "Stock transferred", variant: "success" });
        onSuccess();
        onClose();
      },
      onError: (err) =>
        toast({
          title: "Could not transfer",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  function onSubmit(values: FormValues) {
    clearErrors("root");
    if (values.fromLocationId === values.toLocationId) {
      setError("root", { message: "From and To locations must be different" });
      return;
    }
    const qty = Number(values.quantity);
    if (!(qty > 0)) {
      setError("root", { message: "Quantity must be greater than 0" });
      return;
    }
    if (qty > availableQty + 1e-9) {
      setError("root", {
        message: `Only ${availableQty} available at the from location`,
      });
      return;
    }
    return mutation.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formState.errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {formState.errors.root.message}
            </p>
          )}
          <FormField label="From location" required>
            <Select {...register("fromLocationId", { required: true })}>
              <option value="">Select</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="To location" required>
            <Select {...register("toLocationId", { required: true })}>
              <option value="">Select</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id} disabled={l.id === fromLocationId}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>
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
          {productId && fromLocationId ? (
            <p className="text-xs text-slate-500">
              Available at from location: {balanceQuery.isLoading ? "…" : availableQty}
            </p>
          ) : null}
          <FormField label="Quantity" required>
            <Input
              type="number"
              step="any"
              min="0.001"
              {...register("quantity", { required: true })}
            />
          </FormField>
          {fromLocationId && toLocationId && fromLocationId === toLocationId ? (
            <p className="text-xs text-amber-700">From and To must be different locations.</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                locations.length < 2 ||
                (!!fromLocationId && !!toLocationId && fromLocationId === toLocationId)
              }
            >
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
