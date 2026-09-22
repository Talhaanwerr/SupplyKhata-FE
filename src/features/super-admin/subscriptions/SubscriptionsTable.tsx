"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

interface SubscriptionRow {
  id: string;
  tenantName: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
  amount: number;
}

// TODO: wire to usePaginatedQuery("/subscriptions")
const PLACEHOLDER: SubscriptionRow[] = [];

const columns: Column<SubscriptionRow>[] = [
  {
    key: "tenant",
    header: "Tenant",
    render: (r) => <span className="font-medium">{r.tenantName}</span>,
  },
  { key: "plan", header: "Plan", render: (r) => r.plan },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "amount",
    header: "Amount",
    render: (r) => <span className="tabular-nums">${r.amount}</span>,
  },
  {
    key: "renews",
    header: "Renews On",
    render: (r) => <span className="text-slate-400">{r.currentPeriodEnd}</span>,
  },
];

export function SubscriptionsTable() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-4">
      <SearchInput placeholder="Search subscriptions…" value={search} onChange={setSearch} />
      <DataTable
        columns={columns}
        data={PLACEHOLDER}
        emptyState={
          <EmptyState
            icon={CreditCard}
            title="No subscriptions yet"
            description="Subscriptions will appear once tenants subscribe."
          />
        }
      />
    </div>
  );
}
