"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Beaker } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { productsApi } from "@/lib/products-api";
import { bomApi } from "@/lib/bom-api";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PRODUCT_BOM_QUERY_KEY, PRODUCTS_QUERY_KEY } from "@/constants/query-keys";
import { BomEditor } from "./BomEditor";

export function RecipesView() {
  const { enabled: productionEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.PRODUCTION
  );
  const { enabled: inventoryEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.INVENTORY);
  const { enabled: rawEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RAW_MATERIALS);
  const [productId, setProductId] = useState("");

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "bom-recipes"],
    queryFn: () => productsApi.list({ isActive: true }),
    enabled: productionEnabled,
  });
  const products = productsQuery.data?.data ?? [];

  const bomQuery = useQuery({
    queryKey: [PRODUCT_BOM_QUERY_KEY, productId],
    queryFn: () => bomApi.getActiveForProduct(productId),
    enabled: !!productId && productionEnabled,
  });

  if (flagLoading || !productionEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recipes / BOM"
          description="Finished product recipes from raw materials"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Beaker}
            title={flagLoading ? "Loading…" : "Production is disabled for this workspace"}
            description={
              flagLoading
                ? "Checking feature access…"
                : "Enable the Production flag to manage BOM recipes."
            }
          />
        </div>
      </div>
    );
  }

  const selected = products.find((p) => p.id === productId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recipes / BOM"
        description="Define raw materials consumed per finished product unit"
      />

      {(!inventoryEnabled || !rawEnabled) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Enable <strong>Inventory</strong> and <strong>Raw Materials</strong> before running
          production (stock consume / output). You can still edit recipes with Production on.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <FormField label="Product" required>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select finished product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {!productId ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Choose a product to view or create its recipe.
        </div>
      ) : bomQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading recipe…</div>
      ) : (
        <BomEditor
          key={`${bomQuery.data?.data?.id ?? "new"}-${productId}`}
          productId={productId}
          productName={selected?.name}
          bom={bomQuery.data?.data ?? null}
        />
      )}
    </div>
  );
}
