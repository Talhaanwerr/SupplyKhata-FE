"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, ShoppingCart } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ordersApi } from "@/lib/orders-api";
import { ORDERS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import {
  ORDER_PAYMENT_STATUSES,
  ORDER_STATUSES,
  type OrderListItem,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/types/orders";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fulfillmentVariant(
  status: OrderStatus
): "default" | "pending" | "trial" | "invited" | "warning" | "success" | "cancelled" | "error" {
  switch (status) {
    case "DRAFT":
      return "default";
    case "PLACED":
      return "pending";
    case "SHIPPED":
      return "trial";
    case "PARTIALLY_DELIVERED":
      return "warning";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "error";
    default:
      return "default";
  }
}

function paymentVariant(status: OrderPaymentStatus): "error" | "warning" | "success" | "default" {
  switch (status) {
    case "UNPAID":
      return "error";
    case "PARTIALLY_PAID":
      return "warning";
    case "PAID":
      return "success";
    default:
      return "default";
  }
}

export function OrdersTable() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: res, isLoading } = useQuery({
    queryKey: [ORDERS_QUERY_KEY, page, search, dateFrom, dateTo, status, paymentStatus, pageSize],
    queryFn: () =>
      ordersApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: (status || undefined) as OrderStatus | undefined,
        paymentStatus: (paymentStatus || undefined) as OrderPaymentStatus | undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const orders = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<OrderListItem>[] = [
    {
      key: "orderNumber",
      header: "Number",
      render: (row) => (
        <Link
          href={`/orders/${row.id}`}
          className="hover:text-primary font-medium text-slate-900 hover:underline"
        >
          #{row.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.customer.name}</p>
          <p className="text-xs text-slate-500">{row.customer.phone}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Fulfillment",
      render: (row) => <StatusBadge status={row.status} variant={fulfillmentVariant(row.status)} />,
    },
    {
      key: "paymentStatus",
      header: "Payment",
      render: (row) => (
        <StatusBadge status={row.paymentStatus} variant={paymentVariant(row.paymentStatus)} />
      ),
    },
    {
      key: "deliveryCharges",
      header: "Delivery",
      render: (row) => <span className="text-slate-700">{money(row.deliveryCharges)}</span>,
    },
    {
      key: "total",
      header: "Total",
      render: (row) => <span className="font-medium text-slate-900">{money(row.total)}</span>,
    },
    {
      key: "amountPaid",
      header: "Paid",
      render: (row) => <span className="text-slate-700">{money(row.amountPaid)}</span>,
    },
    {
      key: "amountDue",
      header: "Due",
      render: (row) => <span className="text-slate-700">{money(row.amountDue)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/orders/${row.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search order # or customer…"
        />
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
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All fulfillment</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        <Select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All payment</option>
          {ORDER_PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={ShoppingCart}
            title="No orders"
            description="Create a draft order to get started."
          />
        }
      />
    </div>
  );
}
