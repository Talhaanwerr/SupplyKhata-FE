"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { PRODUCTS_QUERY_KEY } from "@/constants/query-keys";
import { ProductFormModal } from "./ProductFormModal";
import type { Product } from "@/types/products";
import { baseUnitLabel } from "@/types/products";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatSize(product: Product) {
  if (product.volume == null) return "—";
  return `${product.volume}${product.unit ? ` ${product.unit}` : ""}`;
}

interface ProductsTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function ProductsTable({ createOpen, onCreateClose }: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const isActiveFilter = status === "true" ? true : status === "false" ? false : undefined;

  const { data: res, isLoading } = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, search, status],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        isActive: isActiveFilter,
      }),
    placeholderData: (prev) => prev,
  });

  const products = res?.data ?? [];

  const remove = useApiMutation((id: string) => productsApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      setDeleteProduct(null);
      toast({ title: "Product deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete product",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteProduct(null);
    },
  });

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <Link href={`/products/${row.id}`} className="font-medium text-slate-900 hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "baseUnit",
      header: "Unit",
      render: (row) => (
        <span className="text-slate-600">
          {baseUnitLabel(row.baseUnit ?? "PCS")}
          {row.hasPackHelper && row.unitsPerPack && row.packLabel
            ? ` · ${row.unitsPerPack}/${row.packLabel}`
            : ""}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      render: (row) => <span className="text-slate-600">{formatSize(row)}</span>,
    },
    {
      key: "defaultSellingPrice",
      header: "Price / unit",
      render: (row) => formatMoney(row.defaultSellingPrice),
    },
    {
      key: "currentCost",
      header: "Current Cost",
      render: (row) => formatMoney(row.currentCost),
    },
    {
      key: "isReturnable",
      header: "Returnable",
      render: (row) => (row.isReturnable ? "Yes" : "No"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/products/${row.id}`}>
            <Button variant="ghost" size="sm" aria-label="View product">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <PermissionGuard permission={PERMISSIONS.PRODUCTS.UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit product"
              onClick={() => setEditProduct(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.PRODUCTS.DELETE}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete product"
              onClick={() => setDeleteProduct(row)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products..."
          className="sm:max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title="No products yet"
            description="Add your first product to start selling."
          />
        }
      />

      <ProductFormModal open={createOpen} onClose={onCreateClose} />
      <ProductFormModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
      />

      <ConfirmDialog
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => {
          if (deleteProduct) remove.mutate(deleteProduct.id);
        }}
        title="Delete Product"
        description={
          deleteProduct
            ? `Delete "${deleteProduct.name}"? This can be re-created later with the same name.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </>
  );
}
