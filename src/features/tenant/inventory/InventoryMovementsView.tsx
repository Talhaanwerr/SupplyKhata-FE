"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, History } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { INVENTORY_QUERY_KEY } from "@/constants/query-keys";
import { inventoryApi } from "@/lib/inventory-api";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { StockMovementRow, StockMovementType } from "@/types/inventory";

const TYPE_OPTIONS: Array<StockMovementType | ""> = [
  "",
  "OPENING",
  "ADJUSTMENT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
];

export function InventoryMovementsView() {
  const { enabled: inventoryEnabled, isLoading: invLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.INVENTORY
  );
  const [page, setPage] = useState(1);
  const [type, setType] = useState<StockMovementType | "">("");
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const movementsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "movements", page, pageSize, type],
    queryFn: () =>
      inventoryApi.listMovements({
        page,
        limit: pageSize,
        type: type || undefined,
      }),
    enabled: !!inventoryEnabled,
    placeholderData: (prev) => prev,
  });

  const columns: Column<StockMovementRow>[] = [
    {
      key: "when",
      header: "When",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    { key: "type", header: "Type", render: (r) => r.type },
    {
      key: "product",
      header: "Product",
      render: (r) => r.product.name,
    },
    {
      key: "location",
      header: "Location",
      render: (r) => r.location.name,
    },
    {
      key: "qty",
      header: "Qty",
      render: (r) => (
        <span className={r.quantity < 0 ? "text-red-600" : "text-emerald-700"}>
          {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => r.reason ?? "—",
    },
  ];

  if (invLoading || !inventoryEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Stock movements" description="Inventory ledger" />
        <EmptyState
          icon={History}
          title={invLoading ? "Loading…" : "Inventory is disabled"}
          description={
            invLoading ? "Checking feature access…" : "Enable Inventory to view movement history."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock movements"
        description="Opening, adjustments, and transfers (when Warehouse is on)."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-xs">
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value as StockMovementType | "");
            setPage(1);
          }}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t || "all"} value={t}>
              {t || "All types"}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={movementsQuery.data?.data?.items ?? []}
        isLoading={movementsQuery.isLoading}
        currentPage={page}
        totalPages={movementsQuery.data?.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={History}
            title="No movements yet"
            description="Opening and adjustments will appear here."
          />
        }
      />
    </div>
  );
}
