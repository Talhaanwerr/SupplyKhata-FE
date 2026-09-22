"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { staffApi, type StaffMember } from "@/lib/staff-api";
import { STAFF_RIDERS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";

export default function RidersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: res, isLoading } = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, page, search, pageSize],
    queryFn: () =>
      staffApi.list({
        page,
        limit: pageSize,
        role: "rider",
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const riders = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="text-slate-600">{row.email}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "roles",
      header: "Role",
      render: (row) => (
        <span className="text-slate-600">{row.roles.map((r) => r.name).join(", ") || "Rider"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riders"
        description="Users with the Rider role in this workspace. Assign the Rider role from Users."
      />

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Search name or email…"
        className="sm:max-w-xs"
      />

      <DataTable
        columns={columns}
        data={riders}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No riders yet"
            description="Invite a user and assign the Rider role from Users → Assign roles."
          />
        }
      />
    </div>
  );
}
