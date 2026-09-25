"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { plannedStopsApi } from "@/lib/planned-stops-api";
import { customersApi } from "@/lib/customers-api";
import { areasApi } from "@/lib/areas-api";
import { staffApi } from "@/lib/staff-api";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { QTY_RE } from "@/lib/form-number";
import { PERMISSIONS } from "@/constants/permissions";
import {
  AREAS_QUERY_KEY,
  CUSTOMERS_QUERY_KEY,
  PLANNED_STOPS_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
} from "@/constants/query-keys";
import type { PlannedStop, PlannedStopStatus } from "@/types/planned-stops";
import type { Product } from "@/types/products";
import { baseUnitLabel } from "@/types/products";
import { canAccessAny } from "@/lib/can-access";
import { useAuthStore } from "@/store/auth-store";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const STATUSES: { id: PlannedStopStatus | ""; label: string }[] = [
  { id: "", label: "All statuses" },
  { id: "PLANNED", label: "Planned" },
  { id: "INCLUDED", label: "Included in run" },
  { id: "COMPLETED", label: "Completed" },
  { id: "SKIPPED", label: "Skipped" },
  { id: "FAILED", label: "Failed" },
  { id: "CANCELLED", label: "Cancelled" },
];

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CUSTOMERS: { id: string; name: string }[] = [];

interface EditStopState {
  stop: PlannedStop;
  planDate: string;
  items: { productId: string; quantity: string }[];
}

interface SkipFailState {
  stop: PlannedStop;
  action: "skip" | "fail";
  reason: string;
}

interface AddStopState {
  customerId: string;
  planDate: string;
  items: { productId: string; quantity: string }[];
}

export function DailyListView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canManage = canAccessAny(user, [
    PERMISSIONS.PLANNED_STOPS.MANAGE,
    PERMISSIONS.PLANNED_STOPS.UPDATE,
  ]);

  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<PlannedStopStatus | "">("");
  const [areaId, setAreaId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [search, setSearch] = useState("");

  const [editStop, setEditStop] = useState<EditStopState | null>(null);
  const [skipFail, setSkipFail] = useState<SkipFailState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addState, setAddState] = useState<AddStopState>({
    customerId: "",
    planDate: today(),
    items: [],
  });

  // Data queries
  const areasQuery = useQuery({
    queryKey: [AREAS_QUERY_KEY, "daily-list"],
    queryFn: () => areasApi.list(),
  });
  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "daily-list"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
    enabled: canManage,
  });
  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "daily-list"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const customersQuery = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, "daily-list"],
    queryFn: () => customersApi.list({ status: "ACTIVE", limit: 200 }),
    enabled: addOpen,
  });

  const listQuery = useQuery({
    queryKey: [PLANNED_STOPS_QUERY_KEY, "list", date, status, areaId, riderId, search],
    queryFn: () =>
      plannedStopsApi.list({
        date,
        status: status || undefined,
        areaId: areaId || undefined,
        riderId: riderId || undefined,
        search: search || undefined,
      }),
  });

  const areas = useMemo(() => areasQuery.data?.data ?? [], [areasQuery.data?.data]);
  const products: Product[] = productsQuery.data?.data ?? EMPTY_PRODUCTS;
  const customers = customersQuery.data?.data?.items ?? EMPTY_CUSTOMERS;
  const items = listQuery.data?.data?.items ?? [];

  function invalidate() {
    qc.invalidateQueries({ queryKey: [PLANNED_STOPS_QUERY_KEY] });
  }

  // Edit stop mutation
  const patchMutation = useApiMutation(
    () => {
      if (!editStop) throw new Error("No stop selected");
      return plannedStopsApi.patch(editStop.stop.id, {
        planDate: editStop.planDate,
        items: editStop.items
          .filter((i) => QTY_RE.test(i.quantity) && Number(i.quantity) > 0)
          .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
    },
    {
      onSuccess: () => {
        invalidate();
        toast({ title: "Stop updated", variant: "success" });
        setEditStop(null);
      },
      onError: (err) => {
        toast({
          title: "Could not update stop",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  // Skip/fail mutation
  const skipFailMutation = useApiMutation(
    () => {
      if (!skipFail) throw new Error("No stop selected");
      const fn = skipFail.action === "skip" ? plannedStopsApi.skip : plannedStopsApi.fail;
      return fn(skipFail.stop.id, { reason: skipFail.reason.trim() || undefined });
    },
    {
      onSuccess: () => {
        invalidate();
        toast({
          title: `Stop ${skipFail?.action === "skip" ? "skipped" : "marked failed"}`,
          variant: "success",
        });
        setSkipFail(null);
      },
      onError: (err) => {
        toast({
          title: "Could not update stop",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  // Add manual stop mutation
  const addMutation = useApiMutation(
    () => {
      if (!addState.customerId) throw new Error("Customer is required");
      return plannedStopsApi.create({
        customerId: addState.customerId,
        planDate: addState.planDate,
        items: addState.items
          .filter((i) => QTY_RE.test(i.quantity) && Number(i.quantity) > 0)
          .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
    },
    {
      onSuccess: () => {
        invalidate();
        toast({ title: "Stop added", variant: "success" });
        setAddOpen(false);
        setAddState({ customerId: "", planDate: today(), items: [] });
      },
      onError: (err) => {
        toast({
          title: "Could not add stop",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  function openEdit(stop: PlannedStop) {
    setEditStop({
      stop,
      planDate: stop.planDate,
      items: stop.items.map((i) => ({
        productId: i.productId,
        quantity: String(i.quantity),
      })),
    });
  }

  function openAdd() {
    setAddState({
      customerId: "",
      planDate: date,
      items: products.map((p) => ({ productId: p.id, quantity: "0" })),
    });
    setAddOpen(true);
  }

  function setAddItem(productId: string, quantity: string) {
    setAddState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    }));
  }

  function setEditItem(productId: string, quantity: string) {
    setEditStop((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
          }
        : prev
    );
  }

  return (
    <PermissionGuard
      permission={PERMISSIONS.PLANNED_STOPS.READ}
      fallback={
        <EmptyState
          title="Daily list access required"
          description="Ask an owner for planned-stops:read permission."
        />
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Daily List"
          description="Planned delivery stops — filter by date, area, rider"
          action={
            <PermissionGuard permission={PERMISSIONS.PLANNED_STOPS.CREATE}>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Stop
              </Button>
            </PermissionGuard>
          }
        />

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as PlannedStopStatus | "")}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">All areas</option>
            {areas.map((a: { id: string; name: string }) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          {canManage && (
            <Select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
              <option value="">All riders</option>
              {(ridersQuery.data?.data?.items ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName} {r.lastName}
                </option>
              ))}
            </Select>
          )}
          <Input
            placeholder="Search name / phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:col-span-2 lg:col-span-1 xl:col-span-1"
          />
        </div>

        {/* List */}
        {listQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : listQuery.isError ? (
          <ErrorState title="Failed to load" onRetry={() => listQuery.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No planned stops"
            description="No stops match the selected filters. Add a manual stop or set up customer schedules."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Plan date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((stop) => (
                  <tr key={stop.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{stop.customerName}</p>
                      <a
                        href={`tel:${stop.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                      >
                        <Phone className="h-3 w-3" />
                        {stop.customerPhone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{stop.areaName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(stop.planDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {stop.items.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {stop.items.map((item) => (
                            <p key={item.productId} className="text-xs text-slate-700">
                              {item.productName}: {item.quantity}{" "}
                              {baseUnitLabel(item.baseUnit as "PCS" | "LTR" | "KG")}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={stop.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(stop.status === "PLANNED" || stop.status === "INCLUDED") && (
                        <PermissionGuard permission={PERMISSIONS.PLANNED_STOPS.UPDATE}>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(stop)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-300 text-amber-700"
                              onClick={() => setSkipFail({ stop, action: "skip", reason: "" })}
                            >
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700"
                              onClick={() => setSkipFail({ stop, action: "fail", reason: "" })}
                            >
                              Fail
                            </Button>
                          </div>
                        </PermissionGuard>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit stop dialog */}
      <Dialog open={!!editStop} onOpenChange={(v) => !v && setEditStop(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Planned Stop — {editStop?.stop.customerName}</DialogTitle>
            <DialogDescription>
              Change the plan date or product quantities. Rider can further override on the delivery
              form.
            </DialogDescription>
          </DialogHeader>
          {editStop && (
            <div className="space-y-4">
              <FormField label="Plan date">
                <Input
                  type="date"
                  value={editStop.planDate}
                  onChange={(e) =>
                    setEditStop((prev) => (prev ? { ...prev, planDate: e.target.value } : prev))
                  }
                />
              </FormField>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Quantities (base units)</p>
                {editStop.items.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const unit = product ? baseUnitLabel(product.baseUnit ?? "PCS") : "units";
                  const name =
                    product?.name ??
                    editStop.stop.items.find((i) => i.productId === item.productId)?.productName ??
                    item.productId;
                  return (
                    <div key={item.productId} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-slate-700">{name}</span>
                      <div className="w-28">
                        <Input
                          inputMode={product?.allowFractionalQty ? "decimal" : "numeric"}
                          value={item.quantity}
                          onChange={(e) => setEditItem(item.productId, e.target.value)}
                          placeholder={`0 ${unit}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStop(null)}>
              Cancel
            </Button>
            <Button disabled={patchMutation.isPending} onClick={() => patchMutation.mutateAsync()}>
              {patchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip / Fail dialog */}
      <Dialog open={!!skipFail} onOpenChange={(v) => !v && setSkipFail(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {skipFail?.action === "skip" ? "Skip" : "Mark Failed"} — {skipFail?.stop.customerName}
            </DialogTitle>
            <DialogDescription>
              {skipFail?.action === "skip"
                ? "Stop will be skipped. Next stop will be created as per schedule."
                : "Stop will be marked failed. Optionally provide a reason."}
            </DialogDescription>
          </DialogHeader>
          <FormField label="Reason (optional)">
            <Input
              value={skipFail?.reason ?? ""}
              onChange={(e) =>
                setSkipFail((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
              }
              placeholder="e.g. Customer not home"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipFail(null)}>
              Cancel
            </Button>
            <Button
              disabled={skipFailMutation.isPending}
              onClick={() => skipFailMutation.mutateAsync()}
            >
              {skipFailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add manual stop dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Manual Stop</DialogTitle>
            <DialogDescription>
              Create a one-off planned stop for any customer on any date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Customer" required>
              <Select
                value={addState.customerId}
                onChange={(e) => setAddState((prev) => ({ ...prev, customerId: e.target.value }))}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Plan date" required>
              <Input
                type="date"
                value={addState.planDate}
                onChange={(e) => setAddState((prev) => ({ ...prev, planDate: e.target.value }))}
              />
            </FormField>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Quantities{" "}
                <span className="font-normal text-slate-400">(base units, 0 = exclude)</span>
              </p>
              {products.map((product) => {
                const item = addState.items.find((i) => i.productId === product.id);
                const unit = baseUnitLabel(product.baseUnit ?? "PCS");
                return (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-slate-700">
                      {product.name}
                      <span className="ml-1 text-xs text-slate-400">({unit})</span>
                    </span>
                    <div className="w-28">
                      <Input
                        inputMode={product.allowFractionalQty ? "decimal" : "numeric"}
                        value={item?.quantity ?? "0"}
                        onChange={(e) => setAddItem(product.id, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button disabled={addMutation.isPending} onClick={() => addMutation.mutateAsync()}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
