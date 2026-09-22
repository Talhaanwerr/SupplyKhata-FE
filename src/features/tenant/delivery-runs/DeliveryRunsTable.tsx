"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { deliveryRunsApi } from "@/lib/delivery-runs-api";
import { staffApi } from "@/lib/staff-api";
import { DELIVERY_RUNS_QUERY_KEY, STAFF_RIDERS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { DeliveryRunListItem, RunStatus } from "@/types/delivery";

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function personName(row: DeliveryRunListItem) {
  return `${row.rider.firstName} ${row.rider.lastName}`.trim() || row.rider.email;
}

export function DeliveryRunsTable() {
  const [status, setStatus] = useState("");
  const [riderId, setRiderId] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: ridersRes } = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "delivery-runs-filter"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
  });

  const { data: res, isLoading } = useQuery({
    queryKey: [DELIVERY_RUNS_QUERY_KEY, page, pageSize, status, riderId, date],
    queryFn: () =>
      deliveryRunsApi.list({
        page,
        limit: pageSize,
        status: status ? (status as RunStatus) : undefined,
        riderId: riderId || undefined,
        dateFrom: date || undefined,
        dateTo: date || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const runs = res?.data?.items ?? [];
  const riders = ridersRes?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<DeliveryRunListItem>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => <span>{new Date(row.date).toLocaleDateString()}</span>,
    },
    {
      key: "rider",
      header: "Rider",
      render: (row) => <span className="font-medium text-slate-900">{personName(row)}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (row) => <span>{row.vehicle.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "totals",
      header: "Sales / Cash",
      render: (row) => (
        <span>
          {money(row.totalSales)} / {money(row.totalCashCollected)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/delivery-runs/${row.id}`} aria-label="View run">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={date}
          type="date"
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={riderId}
          onChange={(e) => {
            setRiderId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All riders</option>
          {riders.map((rider) => (
            <option key={rider.id} value={rider.id}>
              {`${rider.firstName} ${rider.lastName}`.trim() || rider.email}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={runs}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            title="No delivery runs yet"
            description="Open a run to start recording deliveries."
          />
        }
      />
    </div>
  );
}
