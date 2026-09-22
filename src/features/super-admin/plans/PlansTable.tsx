"use client";

import { DollarSign } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  isActive: boolean;
  trialDays: number;
}

// TODO: wire to usePaginatedQuery("/plans")
const PLACEHOLDER: PlanRow[] = [];

const columns: Column<PlanRow>[] = [
  {
    key: "name",
    header: "Plan",
    sortable: true,
    render: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    key: "price",
    header: "Price",
    render: (r) => (
      <span className="tabular-nums">
        {r.currency} {r.price}/{r.billingCycle.toLowerCase()}
      </span>
    ),
  },
  { key: "maxUsers", header: "Max Users", render: (r) => <span>{r.maxUsers}</span> },
  {
    key: "trialDays",
    header: "Trial",
    render: (r) => <span>{r.trialDays > 0 ? `${r.trialDays}d` : "—"}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge status={r.isActive ? "active" : "inactive"} />,
  },
];

export function PlansTable() {
  return (
    <DataTable
      columns={columns}
      data={PLACEHOLDER}
      emptyState={
        <EmptyState
          icon={DollarSign}
          title="No plans found"
          description="Plans will appear here once seeded."
        />
      }
    />
  );
}
