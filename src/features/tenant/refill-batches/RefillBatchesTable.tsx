"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Droplets } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { refillBatchesApi } from "@/lib/refill-batches-api";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { PRODUCTS_QUERY_KEY, REFILL_BATCHES_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import { RefillBatchFormModal } from "./RefillBatchFormModal";
import type { RefillBatch } from "@/types/refill-batches";

interface RefillBatchesTableProps {
  createOpen: boolean;
  onCreateClose: () => void;
}

export function RefillBatchesTable({ createOpen, onCreateClose }: RefillBatchesTableProps) {
  const [productId, setProductId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editBatch, setEditBatch] = useState<RefillBatch | null>(null);
  const [deleteBatch, setDeleteBatch] = useState<RefillBatch | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "refill-filter"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const products = productsQuery.data?.data ?? [];

  const { data: res, isLoading } = useQuery({
    queryKey: [REFILL_BATCHES_QUERY_KEY, page, productId, dateFrom, dateTo, pageSize],
    queryFn: () =>
      refillBatchesApi.list({
        page,
        limit: pageSize,
        productId: productId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const batches = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const monthTotals = useMemo(() => {
    const map = new Map<string, { name: string; cans: number; cost: number }>();
    for (const row of batches) {
      const key = row.productId;
      const prev = map.get(key) ?? { name: row.product.name, cans: 0, cost: 0 };
      prev.cans += row.cansFilledCount;
      prev.cost += row.totalCost;
      map.set(key, prev);
    }
    return [...map.values()];
  }, [batches]);

  const remove = useApiMutation((id: string) => refillBatchesApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [REFILL_BATCHES_QUERY_KEY] });
      setDeleteBatch(null);
      toast({ title: "Refill batch deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteBatch(null);
    },
  });

  const columns: Column<RefillBatch>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-slate-700">{new Date(row.date).toLocaleDateString()}</span>
      ),
    },
    {
      key: "product",
      header: "Product",
      render: (row) => <span className="font-medium text-slate-900">{row.product.name}</span>,
    },
    {
      key: "cansFilledCount",
      header: "Cans filled",
      render: (row) => <span className="text-slate-700">{row.cansFilledCount}</span>,
    },
    {
      key: "costPerUnit",
      header: "Cost/unit",
      render: (row) => <span className="text-slate-700">{row.costPerUnit.toFixed(2)}</span>,
    },
    {
      key: "totalCost",
      header: "Total",
      render: (row) => <span className="text-slate-700">{row.totalCost.toFixed(2)}</span>,
    },
    {
      key: "remainingCount",
      header: "Remaining",
      render: (row) => (
        <span
          className={row.remainingCount > 0 ? "font-medium text-emerald-700" : "text-slate-500"}
        >
          {row.remainingCount}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard permission={PERMISSIONS.REFILL.UPDATE}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditBatch(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.REFILL.DELETE}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteBatch(row)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          aria-label="Date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          aria-label="Date to"
        />
      </div>

      {monthTotals.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="mb-1 font-medium text-slate-900">Page totals by product</p>
          <ul className="space-y-0.5">
            {monthTotals.map((t) => (
              <li key={t.name}>
                {t.name}: {t.cans} cans · {t.cost.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DataTable
        columns={columns}
        data={batches}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={Droplets}
            title="No refill batches"
            description="Log plant fills to track cans and fill cost per product."
          />
        }
      />

      <RefillBatchFormModal open={createOpen} onClose={onCreateClose} />
      <RefillBatchFormModal
        open={!!editBatch}
        onClose={() => setEditBatch(null)}
        batch={editBatch}
      />
      <ConfirmDialog
        open={!!deleteBatch}
        onClose={() => setDeleteBatch(null)}
        onConfirm={() => {
          if (deleteBatch) remove.mutate(deleteBatch.id);
        }}
        title="Delete refill batch?"
        description="This cannot be undone. Batches with loads on delivery runs may be rejected."
        confirmLabel="Delete"
        isLoading={remove.isPending}
        variant="destructive"
      />
    </div>
  );
}
