"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { tenantsApi } from "@/lib/tenants-api";
import { TENANTS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { TenantListItem } from "@/types/tenants";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function TenantsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: res, isLoading } = useQuery({
    queryKey: [TENANTS_QUERY_KEY, page, search, statusFilter, pageSize],
    queryFn: () =>
      tenantsApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const items = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<TenantListItem>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <Link
          href={`/super-admin/tenants/${row.id}`}
          className="text-primary font-medium hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (row) => <code className="text-xs">{row.slug}</code>,
    },
    {
      key: "subdomain",
      header: "Subdomain",
      render: (row) => <span className="text-sm text-slate-500">{row.subdomain ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "currency",
      header: "Currency",
      render: (row) => <span className="text-sm text-slate-500">{row.currency}</span>,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => (
        <span className="text-xs text-slate-400">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (row) => (
        <Link href={`/super-admin/tenants/${row.id}`}>
          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Eye className="h-4 w-4" />
          </button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search tenants…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="sm:w-44"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
            icon={Building2}
            title="No tenants yet"
            description="Create your first tenant to get started."
          />
        }
      />
    </div>
  );
}
