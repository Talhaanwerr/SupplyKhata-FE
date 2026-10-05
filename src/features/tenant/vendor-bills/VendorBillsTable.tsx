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
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { vendorsApi } from "@/lib/vendors-api";
import { VENDOR_BILLS_QUERY_KEY, VENDORS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { VendorBillListItem, VendorBillStatus } from "@/types/vendor-bills";

const STATUSES: VendorBillStatus[] = ["UNPAID", "PARTIALLY_PAID", "PAID", "VOID"];

export function VendorBillsTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const vendorsQuery = useQuery({
    queryKey: [VENDORS_QUERY_KEY, "bills-filter"],
    queryFn: () => vendorsApi.list({ isActive: true, limit: 100 }),
  });
  const vendors = vendorsQuery.data?.data?.items ?? [];

  const { data: res, isLoading } = useQuery({
    queryKey: [VENDOR_BILLS_QUERY_KEY, page, search, status, vendorId, pageSize],
    queryFn: () =>
      vendorBillsApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        status: (status as VendorBillStatus) || undefined,
        vendorId: vendorId || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const items = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<VendorBillListItem>[] = [
    {
      key: "billNumber",
      header: "Bill #",
      render: (row) => (
        <Link
          href={`/vendor-bills/${row.id}`}
          className="font-medium text-slate-900 hover:underline"
        >
          {row.billNumber || row.id.slice(0, 8)}
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
      key: "total",
      header: "Total",
      render: (row) => row.totalAmount.toFixed(2),
    },
    {
      key: "remaining",
      header: "Remaining",
      render: (row) => row.remaining.toFixed(2),
    },
    {
      key: "date",
      header: "Bill date",
      render: (row) => new Date(row.billDate).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link href={`/vendor-bills/${row.id}`}>
          <Button variant="ghost" size="sm" aria-label="View bill">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search bill number…"
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
            title="No vendor bills yet"
            description="Create a standalone bill or from a goods receipt."
          />
        }
      />
    </>
  );
}
