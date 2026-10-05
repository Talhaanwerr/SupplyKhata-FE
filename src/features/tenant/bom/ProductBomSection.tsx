"use client";

import { useQuery } from "@tanstack/react-query";
import { BomEditor } from "./BomEditor";
import { bomApi } from "@/lib/bom-api";
import { PRODUCT_BOM_QUERY_KEY } from "@/constants/query-keys";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";

export function ProductBomSection({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const { data: res, isLoading } = useQuery({
    queryKey: [PRODUCT_BOM_QUERY_KEY, productId],
    queryFn: () => bomApi.getActiveForProduct(productId),
    enabled: !!productId,
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading recipe…</div>;
  }

  return (
    <PermissionGuard permission={PERMISSIONS.BOM.READ}>
      <BomEditor
        key={`${bom?.id ?? "new"}-${productId}`}
        productId={productId}
        productName={productName}
        bom={res?.data ?? null}
      />
    </PermissionGuard>
  );
}
