"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { purchaseOrdersApi } from "@/lib/purchase-orders-api";
import { vendorsApi } from "@/lib/vendors-api";
import { PURCHASE_ORDERS_QUERY_KEY, VENDORS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { PurchaseOrderListItem, PurchaseOrderStatus } from "@/types/purchase-orders";

const STATUSES: PurchaseOrderStatus[] = [
  "DRAFT",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

export function PurchaseOrdersTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const vendorsQuery = useQuery({
    queryKey: [VENDORS_QUERY_KEY, "po-filter"],
    queryFn: () => vendorsApi.list({ isActive: true, limit: 100 }),
  });
  const vendors = vendorsQuery.data?.data?.items ?? [];

  const { data: res, isLoading } = useQuery({
    queryKey: [
      PURCHASE_ORDERS_QUERY_KEY,
      page,
      search,
      status,
      vendorId,
      dateFrom,
      dateTo,
      pageSize,
    ],
    queryFn: () =>
      purchaseOrdersApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        status: (status as PurchaseOrderStatus) || undefined,
        vendorId: vendorId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const items = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<PurchaseOrderListItem>[] = [
    {
      key: "poNumber",
      header: "PO #",
      render: (row) => (
        <Link
          href={`/purchase-orders/${row.id}`}
          className="font-medium text-slate-900 hover:underline"
        >
          {row.poNumber || row.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (row) => row.vendor?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "lines",
      header: "Lines",
      render: (row) => row.lineCount,
    },
    {
      key: "date",
      header: "Created",
      render: (row) => (
        <span className="text-slate-600">{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link href={`/purchase-orders/${row.id}`}>
          <Button variant="ghost" size="sm" aria-label="View PO">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search PO number…"
          className="sm:max-w-xs"
        />
        <Select
          className="w-48"
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
          className="w-52"
          value={vendorId}
          onChange={(e) => {
            setVendorId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          className="w-40"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          className="w-40"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No purchase orders yet"
            description="Create a draft PO against a vendor."
          />
        }
      />
    </>
  );
}
