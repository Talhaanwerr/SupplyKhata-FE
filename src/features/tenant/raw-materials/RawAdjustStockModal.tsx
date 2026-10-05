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
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { inventoryApi } from "@/lib/inventory-api";
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INVENTORY_QUERY_KEY, RAW_MATERIALS_QUERY_KEY } from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { pickDefaultLocationId } from "@/lib/location-default";

type FormValues = {
  locationId: string;
  rawMaterialId: string;
  quantityDelta: string;
  reason: string;
};

export function RawAdjustStockModal({
  open,
  onClose,
  warehouseEnabled,
  fixedRawMaterialId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  warehouseEnabled: boolean;
  fixedRawMaterialId?: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { enabled: inventoryEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.INVENTORY);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { locationId: "", rawMaterialId: "", quantityDelta: "", reason: "" },
  });

  const materialsQuery = useQuery({
    queryKey: [RAW_MATERIALS_QUERY_KEY, "adjust"],
    queryFn: () => rawMaterialsApi.list({ isActive: true, limit: 100 }),
    enabled: open && !fixedRawMaterialId,
  });
  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "raw-adjust"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
    enabled: open && inventoryEnabled,
  });

  const materials = materialsQuery.data?.data?.items ?? [];
  const locations = useMemo(() => locationsQuery.data?.data ?? [], [locationsQuery.data?.data]);
  const showLocationSelect = inventoryEnabled && (warehouseEnabled || locations.length > 1);

  useEffect(() => {
    if (!open) return;
    reset({
      locationId: pickDefaultLocationId(locations),
      rawMaterialId: fixedRawMaterialId ?? "",
      quantityDelta: "",
      reason: "",
    });
  }, [open, fixedRawMaterialId, locations, reset]);

  const mutation = useApiMutation(
    (values: FormValues) =>
      rawMaterialsApi.postAdjustment({
        locationId: showLocationSelect && values.locationId ? values.locationId : undefined,
        rawMaterialId: fixedRawMaterialId || values.rawMaterialId,
        quantityDelta: Number(values.quantityDelta),
        reason: values.reason.trim(),
      }),
    {
      onSuccess: () => {
        toast({ title: "Adjustment posted", variant: "success" });
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
        <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutateAsync(v))}>
          {!fixedRawMaterialId && (
            <FormField label="Raw material" required>
              <Select {...register("rawMaterialId", { required: true })}>
                <option value="">Select…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {showLocationSelect && (
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
          )}
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
              placeholder="Count fix / damage / found"
              {...register("reason", { required: true })}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Post adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
