"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { productionApi } from "@/lib/production-api";
import { productsApi } from "@/lib/products-api";
import { PRODUCTION_ORDERS_QUERY_KEY, PRODUCTS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { ProductionOrderListItem, ProductionOrderStatus } from "@/types/production";

const STATUSES: ProductionOrderStatus[] = [
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export function ProductionOrdersTable() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [productId, setProductId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "production-filter"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const products = productsQuery.data?.data ?? [];

  const { data: res, isLoading } = useQuery({
    queryKey: [PRODUCTION_ORDERS_QUERY_KEY, page, status, productId, dateFrom, dateTo, pageSize],
    queryFn: () =>
      productionApi.list({
        page,
        limit: pageSize,
        status: (status || undefined) as ProductionOrderStatus | undefined,
        productId: productId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const payload = res?.data;
  const rows = payload?.items ?? [];
  const totalPages = payload?.meta.totalPages ?? 1;

  const columns: Column<ProductionOrderListItem>[] = [
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <Link href={`/production/${row.id}`} className="font-medium hover:underline">
          {row.product?.name ?? row.productId.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "plannedQty",
      header: "Planned",
      render: (row) => row.plannedQty.toFixed(3),
    },
    {
      key: "actualQty",
      header: "Actual",
      render: (row) => (row.actualQty != null ? row.actualQty.toFixed(3) : "—"),
    },
    {
      key: "location",
      header: "Location",
      render: (row) => row.location?.name ?? "—",
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => row.createdAt.slice(0, 10),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/production/${row.id}`}>Open</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
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
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title="No production orders"
            description="Create a draft to plan and run production."
          />
        }
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
