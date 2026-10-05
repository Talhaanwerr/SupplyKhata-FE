"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { productionApi } from "@/lib/production-api";
import { productsApi } from "@/lib/products-api";
import { inventoryApi } from "@/lib/inventory-api";
import { bomApi } from "@/lib/bom-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { pickDefaultLocationId } from "@/lib/location-default";
import {
  PRODUCT_BOM_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  INVENTORY_QUERY_KEY,
} from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";

export function ProductionOrderCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { enabled: warehouseEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.WAREHOUSE);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [plannedQty, setPlannedQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [rootError, setRootError] = useState("");

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "production-create"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const products = productsQuery.data?.data ?? [];

  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "production"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
  });
  const locations = useMemo(() => locationsQuery.data?.data ?? [], [locationsQuery.data?.data]);
  const effectiveLocationId = locationId || pickDefaultLocationId(locations);
  const showLocation = warehouseEnabled || locations.length > 1;

  const bomQuery = useQuery({
    queryKey: [PRODUCT_BOM_QUERY_KEY, productId],
    queryFn: () => bomApi.getActiveForProduct(productId),
    enabled: !!productId,
  });
  const activeBom = bomQuery.data?.data;

  const save = useApiMutation(
    async () => {
      if (!productId) throw new Error("Select a product");
      if (!activeBom) throw new Error("Product needs an active BOM first");
      const qty = Number(plannedQty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("Planned qty must be > 0");
      return productionApi.create({
        productId,
        bomId: activeBom.id,
        locationId: effectiveLocationId || undefined,
        plannedQty: qty,
        notes: notes.trim() || null,
      });
    },
    {
      onSuccess: (res) => {
        toast({ title: "Production order created", variant: "success" });
        if (res.data?.id) router.push(`/production/${res.data.id}`);
      },
      onError: (err) => setRootError(getSafeErrorMessage(err)),
    }
  );

  return (
    <div className="space-y-6">
      {rootError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rootError}</p>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <FormField label="Product" required>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Planned qty" required>
          <Input
            type="number"
            step="any"
            min="0.001"
            value={plannedQty}
            onChange={(e) => setPlannedQty(e.target.value)}
          />
        </FormField>
        {showLocation && (
          <FormField label="Location">
            <Select value={effectiveLocationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Default location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.isDefault ? " (default)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </FormField>
      </div>

      {productId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {bomQuery.isLoading ? (
            "Loading BOM…"
          ) : !activeBom ? (
            <span className="text-amber-800">
              No active BOM for this product. Create a recipe first.
            </span>
          ) : (
            <>
              Active BOM v{activeBom.version}
              {activeBom.name ? ` — ${activeBom.name}` : ""} · {activeBom.lines.length} raw line(s)
            </>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={save.isPending || !activeBom}
          onClick={async () => {
            setRootError("");
            try {
              await save.mutateAsync();
            } catch (err) {
              if (err instanceof Error) setRootError(err.message);
            }
          }}
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create draft
        </Button>
      </div>
    </div>
  );
}
