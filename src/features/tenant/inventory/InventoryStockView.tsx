"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  History,
  MapPin,
  PackagePlus,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PERMISSIONS } from "@/constants/permissions";
import { INVENTORY_QUERY_KEY } from "@/constants/query-keys";
import { inventoryApi } from "@/lib/inventory-api";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { StockBalanceRow } from "@/types/inventory";
import { OpeningStockModal } from "./OpeningStockModal";
import { AdjustStockModal } from "./AdjustStockModal";
import { TransferStockModal } from "./TransferStockModal";

export function InventoryStockView() {
  const { enabled: inventoryEnabled, isLoading: invLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.INVENTORY
  );
  const { enabled: warehouseEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.WAREHOUSE);
  const [page, setPage] = useState(1);
  const [lowOnly, setLowOnly] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const qc = useQueryClient();

  const balancesQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "balances", page, pageSize, lowOnly],
    queryFn: () =>
      inventoryApi.listBalances({
        page,
        limit: pageSize,
        lowStockOnly: lowOnly || undefined,
      }),
    enabled: !!inventoryEnabled,
    placeholderData: (prev) => prev,
  });

  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "stock-view"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
    enabled: !!inventoryEnabled,
  });

  const items = balancesQuery.data?.data?.items ?? [];
  const totalPages = balancesQuery.data?.data?.meta.totalPages ?? 1;
  const locationCount = locationsQuery.data?.data?.length ?? 0;
  const showLocationColumn = !!warehouseEnabled || locationCount > 1;

  const columns: Column<StockBalanceRow>[] = useMemo(() => {
    const cols: Column<StockBalanceRow>[] = [
      {
        key: "product",
        header: "Product",
        render: (row) => (
          <div>
            <p className="font-medium text-slate-900">{row.product.name}</p>
            {row.product.sku ? <p className="text-xs text-slate-500">{row.product.sku}</p> : null}
          </div>
        ),
      },
    ];
    if (showLocationColumn) {
      cols.push({
        key: "location",
        header: "Location",
        render: (row) => <span className="text-slate-700">{row.location.name}</span>,
      });
    }
    cols.push(
      {
        key: "qty",
        header: "On hand",
        render: (row) => (
          <span className={row.isLowStock ? "font-semibold text-amber-700" : "text-slate-900"}>
            {row.quantity} {row.product.baseUnit}
            {row.isLowStock ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 uppercase">
                Low
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "reorder",
        header: "Reorder",
        render: (row) => (
          <span className="text-slate-600">
            {row.product.reorderLevel != null ? String(row.product.reorderLevel) : "—"}
          </span>
        ),
      }
    );
    return cols;
  }, [showLocationColumn]);

  if (invLoading || !inventoryEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory" description="Finished-goods stock on hand." />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Warehouse}
            title={invLoading ? "Loading…" : "Inventory is disabled for this workspace"}
            description={
              invLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable Inventory."
            }
          />
        </div>
      </div>
    );
  }

  function refresh() {
    void qc.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={
          warehouseEnabled
            ? "Stock by location. Truck delivery-run stock is separate."
            : "Single-location stock. Enable Warehouse for multiple locations and transfers."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory/movements">
                <History className="h-4 w-4" />
                Movements
              </Link>
            </Button>
            {warehouseEnabled ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/inventory/locations">
                  <MapPin className="h-4 w-4" />
                  Locations
                </Link>
              </Button>
            ) : null}
            <PermissionGuard permission={PERMISSIONS.INVENTORY.CREATE}>
              <Button size="sm" onClick={() => setOpeningOpen(true)}>
                <PackagePlus className="h-4 w-4" />
                Opening
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.INVENTORY.ADJUST}>
              <Button size="sm" variant="secondary" onClick={() => setAdjustOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                Adjust
              </Button>
            </PermissionGuard>
            {warehouseEnabled ? (
              <PermissionGuard permission={PERMISSIONS.INVENTORY.TRANSFER}>
                <span
                  title={
                    locationCount < 2 ? "Need at least two locations to transfer stock" : undefined
                  }
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={locationCount < 2}
                    onClick={() => setTransferOpen(true)}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Transfer
                  </Button>
                </span>
              </PermissionGuard>
            ) : null}
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => {
              setLowOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-300"
          />
          Low stock only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={balancesQuery.isLoading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={Warehouse}
            title="No stock yet"
            description="Post opening stock to set day-0 balances."
          />
        }
      />

      <OpeningStockModal
        open={openingOpen}
        onClose={() => setOpeningOpen(false)}
        warehouseEnabled={!!warehouseEnabled}
        onSuccess={refresh}
      />
      <AdjustStockModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        warehouseEnabled={!!warehouseEnabled}
        onSuccess={refresh}
      />
      {warehouseEnabled ? (
        <TransferStockModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          onSuccess={refresh}
        />
      ) : null}
    </div>
  );
}
