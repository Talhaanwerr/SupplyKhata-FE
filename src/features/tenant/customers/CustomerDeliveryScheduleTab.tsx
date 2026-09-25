"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { deliverySchedulesApi } from "@/lib/delivery-schedules-api";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { QTY_RE } from "@/lib/form-number";
import { PERMISSIONS } from "@/constants/permissions";
import {
  DELIVERY_SCHEDULES_QUERY_KEY,
  PLANNED_STOPS_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
} from "@/constants/query-keys";
import type { Product } from "@/types/products";
import { baseUnitLabel } from "@/types/products";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { EmptyState } from "@/components/ui/empty-state";
import type { DeliverySchedule } from "@/types/delivery-schedule";

const EMPTY_PRODUCTS: Product[] = [];

/** Helper: "Every N days" display text */
function intervalHelperText(n: number): string {
  if (!Number.isInteger(n) || n < 1) return "";
  if (n === 1) return "Every day (rozana)";
  if (n === 2) return "Every other day — ek din chor ke";
  return `Every ${n} days — ${n - 1} din chor ke`;
}

interface ProductQtyRow {
  productId: string;
  defaultQuantity: string;
}

interface ScheduleDraft {
  seedKey: string;
  intervalDays: string;
  isActive: boolean;
  startDate: string;
  rows: ProductQtyRow[];
}

function buildSeededDraft(
  seedKey: string,
  schedule: DeliverySchedule | null,
  products: Product[]
): ScheduleDraft {
  const scheduleItems = schedule?.items ?? [];
  return {
    seedKey,
    intervalDays: String(schedule?.intervalDays ?? 2),
    isActive: schedule?.isActive ?? true,
    startDate: schedule?.startDate ?? "",
    rows: products.map((p) => {
      const existing = scheduleItems.find((i) => i.productId === p.id);
      return {
        productId: p.id,
        defaultQuantity: existing ? String(existing.defaultQuantity) : "0",
      };
    }),
  };
}

export function CustomerDeliveryScheduleTab({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const scheduleQuery = useQuery({
    queryKey: [DELIVERY_SCHEDULES_QUERY_KEY, customerId],
    queryFn: () => deliverySchedulesApi.get(customerId),
    enabled: !!customerId,
  });

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "schedule-tab"],
    queryFn: () => productsApi.list({ isActive: true }),
  });

  const schedule = scheduleQuery.data?.data ?? null;
  const products: Product[] = productsQuery.data?.data ?? EMPTY_PRODUCTS;
  const productIdsKey = products.map((p) => p.id).join(",");
  const seedKey = `${schedule?.id ?? "new"}|${schedule?.updatedAt ?? ""}|${productIdsKey}`;

  const seeded = useMemo(
    () => buildSeededDraft(seedKey, schedule, products),
    [seedKey, schedule, products]
  );

  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const form = draft?.seedKey === seedKey ? draft : seeded;
  const dirty = draft?.seedKey === seedKey;

  function patchForm(patch: Partial<Omit<ScheduleDraft, "seedKey">>) {
    setDraft({ ...form, ...patch, seedKey });
  }

  const saveMutation = useApiMutation(
    () => {
      const interval = Number(form.intervalDays);
      if (!Number.isInteger(interval) || interval < 1) {
        throw new Error("Interval days must be a whole number ≥ 1");
      }
      return deliverySchedulesApi.upsert(customerId, {
        intervalDays: interval,
        isActive: form.isActive,
        startDate: form.startDate.trim() || null,
        items: form.rows
          .filter((r) => QTY_RE.test(r.defaultQuantity) && Number(r.defaultQuantity) > 0)
          .map((r) => ({
            productId: r.productId,
            defaultQuantity: Number(r.defaultQuantity),
          })),
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [DELIVERY_SCHEDULES_QUERY_KEY, customerId] });
        qc.invalidateQueries({ queryKey: [PLANNED_STOPS_QUERY_KEY] });
        toast({ title: "Schedule saved", variant: "success" });
        setDraft(null);
      },
      onError: (err) => {
        toast({
          title: "Could not save schedule",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  function setRow(productId: string, qty: string) {
    patchForm({
      rows: form.rows.map((r) => (r.productId === productId ? { ...r, defaultQuantity: qty } : r)),
    });
  }

  const interval = Number(form.intervalDays);
  const helperText = intervalHelperText(interval);

  if (scheduleQuery.isLoading || productsQuery.isLoading) {
    return <p className="py-4 text-sm text-slate-500">Loading schedule…</p>;
  }

  return (
    <PermissionGuard
      permission={PERMISSIONS.SCHEDULES.READ}
      fallback={
        <EmptyState
          title="Schedule access required"
          description="Ask an owner for schedules:read permission."
        />
      }
    >
      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-900">Delivery Cadence</p>
            <p className="text-xs text-slate-500">
              How often should this customer receive deliveries? System keeps one upcoming planned
              stop at all times.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Interval (days)" description={helperText || undefined}>
              <Input
                inputMode="numeric"
                value={form.intervalDays}
                onChange={(e) => patchForm({ intervalDays: e.target.value })}
                placeholder="e.g. 2"
              />
            </FormField>

            <FormField
              label="Start date (optional)"
              description="First delivery date. Leave blank to start from today."
            >
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => patchForm({ startDate: e.target.value })}
              />
            </FormField>

            <div className="flex flex-col justify-end">
              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.isActive}
                    onChange={(e) => patchForm({ isActive: e.target.checked })}
                  />
                  <div className="peer-checked:bg-primary h-5 w-10 rounded-full bg-slate-300 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">Schedule active</span>
              </label>
              {!form.isActive && (
                <p className="mt-1 text-xs text-amber-600">
                  Schedule paused — no new planned stops will be created.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-900">Default Quantities</p>
            <p className="text-xs text-slate-500">
              Default qty per product in base units for each planned stop. 0 = product not included.
              Rider can override live on the delivery form.
            </p>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-slate-500">No active products found.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const row = form.rows.find((r) => r.productId === product.id);
                const unit = baseUnitLabel(product.baseUnit ?? "PCS");
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        {unit} · default price {product.defaultSellingPrice}/{unit}
                        {product.hasPackHelper && product.packLabel
                          ? ` · pack: ${product.unitsPerPack} ${product.packLabel}`
                          : ""}
                      </p>
                    </div>
                    <div className="w-28 shrink-0">
                      <FormField label={`Qty (${unit})`}>
                        <Input
                          inputMode={product.allowFractionalQty ? "decimal" : "numeric"}
                          value={row?.defaultQuantity ?? "0"}
                          onChange={(e) => setRow(product.id, e.target.value)}
                          placeholder="0"
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PermissionGuard permission={PERMISSIONS.SCHEDULES.UPDATE}>
          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutateAsync()}
              disabled={saveMutation.isPending || !dirty}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Schedule
            </Button>
          </div>
        </PermissionGuard>
      </div>
    </PermissionGuard>
  );
}
