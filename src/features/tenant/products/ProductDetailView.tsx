"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  PRODUCT_COSTS_QUERY_KEY,
  PRODUCT_DETAIL_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
} from "@/constants/query-keys";
import { ProductFormModal } from "./ProductFormModal";
import { UpdateCostModal } from "./UpdateCostModal";
import type { ProductCost } from "@/types/products";

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ProductDetailView() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: productRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [PRODUCT_DETAIL_QUERY_KEY, productId],
    queryFn: () => productsApi.get(productId),
    enabled: !!productId,
  });

  const { data: costsRes, isLoading: costsLoading } = useQuery({
    queryKey: [PRODUCT_COSTS_QUERY_KEY, productId],
    queryFn: () => productsApi.listCosts(productId),
    enabled: !!productId,
  });

  const product = productRes?.data;
  const costs = costsRes?.data ?? [];

  const remove = useApiMutation(() => productsApi.remove(productId), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      toast({ title: "Product deleted", variant: "success" });
      router.push("/products");
    },
    onError: (err) => {
      toast({
        title: "Could not delete product",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteOpen(false);
    },
  });

  const costColumns: Column<ProductCost>[] = [
    {
      key: "effectiveFrom",
      header: "Effective From",
      render: (row) => {
        const d = new Date(row.effectiveFrom);
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      },
    },
    {
      key: "costPerUnit",
      header: "Cost / Unit",
      render: (row) => formatMoney(row.costPerUnit),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => row.notes || "—",
    },
  ];

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading product…</div>;
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Product not found.</p>
        <Link href="/products" className="text-sm text-slate-700 underline">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/products"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </Link>
        <PageHeader
          title={product.name}
          description="Product details and cost history"
          action={
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission={PERMISSIONS.PRODUCTS.UPDATE}>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.PRODUCTS.DELETE}>
                <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                  Delete
                </Button>
              </PermissionGuard>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Size</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {product.volume != null
              ? `${product.volume}${product.unit ? ` ${product.unit}` : ""}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Selling Price
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatMoney(product.defaultSellingPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Current Cost</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatMoney(product.currentCost)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Status</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={product.isActive ? "ACTIVE" : "INACTIVE"} />
            <span className="text-xs text-slate-500">
              {product.isReturnable ? "Returnable" : "Non-returnable"}
            </span>
          </div>
        </div>
        {(product.sku || product.containerType) && (
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 sm:col-span-2 lg:col-span-4">
            {product.sku && <span>SKU: {product.sku}</span>}
            {product.containerType && <span>Container: {product.containerType}</span>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cost History</h2>
            <p className="text-sm text-slate-500">New entries do not change past sale costs.</p>
          </div>
          <PermissionGuard permission={PERMISSIONS.PRODUCTS.UPDATE}>
            <Button onClick={() => setCostOpen(true)}>
              <Plus className="h-4 w-4" />
              Update Cost
            </Button>
          </PermissionGuard>
        </div>

        <DataTable
          columns={costColumns}
          data={costs}
          isLoading={costsLoading}
          emptyState={
            <EmptyState
              title="No cost history"
              description="Add the first cost entry for this product."
            />
          }
        />
      </div>

      <ProductFormModal open={editOpen} onClose={() => setEditOpen(false)} product={product} />
      <UpdateCostModal open={costOpen} onClose={() => setCostOpen(false)} productId={productId} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
        title="Delete Product"
        description={`Delete "${product.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </div>
  );
}
