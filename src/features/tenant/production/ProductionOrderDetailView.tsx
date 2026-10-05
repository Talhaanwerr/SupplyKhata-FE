"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Play, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { productionApi } from "@/lib/production-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  PRODUCTION_ORDER_DETAIL_QUERY_KEY,
  PRODUCTION_ORDERS_QUERY_KEY,
} from "@/constants/query-keys";
import { CompleteProductionModal } from "./CompleteProductionModal";

export function ProductionOrderDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [PRODUCTION_ORDER_DETAIL_QUERY_KEY, id],
    queryFn: () => productionApi.get(id),
    enabled: !!id,
  });
  const order = res?.data;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [PRODUCTION_ORDERS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [PRODUCTION_ORDER_DETAIL_QUERY_KEY, id] });
  };

  const runAction = useApiMutation(
    async (action: "plan" | "start") => {
      if (action === "plan") return productionApi.plan(id);
      return productionApi.start(id);
    },
    {
      onSuccess: (_r, action) => {
        invalidate();
        toast({
          title: action === "plan" ? "Order planned" : "Production started",
          variant: "success",
        });
      },
      onError: (err) =>
        toast({
          title: "Action failed",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  const cancel = useApiMutation(() => productionApi.cancel(id, cancelReason.trim() || undefined), {
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
      toast({ title: "Order cancelled", variant: "success" });
    },
    onError: (err) =>
      toast({
        title: "Could not cancel",
        description: getSafeErrorMessage(err),
        variant: "error",
      }),
  });

  if (isLoading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (isError || !order) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Production order not found.</p>
        <Link href="/production" className="text-sm underline">
          Back
        </Link>
      </div>
    );
  }

  const canPlan = order.status === "DRAFT";
  const canStart = order.status === "PLANNED";
  const canComplete = order.status === "IN_PROGRESS";
  const canCancel =
    order.status === "DRAFT" || order.status === "PLANNED" || order.status === "IN_PROGRESS";

  const expectedBasis =
    order.actualQty != null && order.status === "COMPLETED" ? order.actualQty : order.plannedQty;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/production"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Production
        </Link>
        <PageHeader
          title={order.product?.name ?? "Production order"}
          description={`BOM v${order.bom?.version ?? "—"} · ${order.location?.name ?? "Location"}`}
          action={
            <div className="flex flex-wrap gap-2">
              {canPlan && (
                <PermissionGuard permission={PERMISSIONS.PRODUCTION.CREATE}>
                  <Button disabled={runAction.isPending} onClick={() => runAction.mutate("plan")}>
                    <Send className="h-4 w-4" />
                    Plan
                  </Button>
                </PermissionGuard>
              )}
              {canStart && (
                <PermissionGuard permission={PERMISSIONS.PRODUCTION.START}>
                  <Button disabled={runAction.isPending} onClick={() => runAction.mutate("start")}>
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                </PermissionGuard>
              )}
              {canComplete && (
                <PermissionGuard permission={PERMISSIONS.PRODUCTION.COMPLETE}>
                  <Button onClick={() => setCompleteOpen(true)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </Button>
                </PermissionGuard>
              )}
              {canCancel && (
                <PermissionGuard permission={PERMISSIONS.PRODUCTION.CANCEL}>
                  <Button variant="outline" onClick={() => setCancelOpen(true)}>
                    Cancel
                  </Button>
                </PermissionGuard>
              )}
            </div>
          }
        />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400 uppercase">Status</p>
          <div className="mt-1">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Planned</p>
          <p className="mt-1 text-sm font-semibold">{order.plannedQty}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Actual</p>
          <p className="mt-1 text-sm font-semibold">
            {order.actualQty != null ? order.actualQty : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Scrap</p>
          <p className="mt-1 text-sm font-semibold">
            {order.scrapQty != null ? order.scrapQty : "—"}
          </p>
        </div>
        {order.varianceNote && (
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-400 uppercase">Variance note</p>
            <p className="mt-1 text-sm">{order.varianceNote}</p>
          </div>
        )}
        {order.cancelReason && (
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-400 uppercase">Cancel reason</p>
            <p className="mt-1 text-sm">{order.cancelReason}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Expected raw (BOM × {order.status === "COMPLETED" ? "actual" : "planned"})
        </h3>
        {(order.expectedRaw ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No BOM lines.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(order.expectedRaw ?? []).map((line) => {
              const qty =
                order.status === "COMPLETED" && order.actualQty != null
                  ? line.qtyPerOutputUnit * order.actualQty
                  : line.expectedQty;
              return (
                <li key={line.rawMaterialId} className="flex justify-between py-2 text-sm">
                  <span>
                    {line.rawMaterial?.name ?? line.rawMaterialId} ({line.rawMaterial?.unit ?? ""})
                  </span>
                  <span>
                    {qty.toFixed(3)} ({line.qtyPerOutputUnit} × {expectedBasis})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {order.status === "COMPLETED" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Consume snapshot · finished IN {order.actualQty}
          </h3>
          {(order.consumeLines ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No consume lines recorded.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {order.consumeLines.map((c) => (
                <li key={c.id} className="flex justify-between py-2 text-sm">
                  <span>{c.rawMaterial?.name ?? c.rawMaterialId}</span>
                  <span>{c.qtyConsumed.toFixed(3)} consumed</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <CompleteProductionModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        order={order}
        onSuccess={invalidate}
      />

      {order.status === "IN_PROGRESS" ? (
        <Dialog open={cancelOpen} onOpenChange={(v) => !v && setCancelOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel production order</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Reason is required. No stock has been posted yet.
            </p>
            <FormField label="Reason" required>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Required"
              />
            </FormField>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>
                Keep order
              </Button>
              <Button
                disabled={cancel.isPending || !cancelReason.trim()}
                onClick={() => cancel.mutate()}
              >
                Cancel order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => cancel.mutate()}
          title="Cancel production order"
          description="Cancel this order? No stock changes."
          confirmLabel="Cancel order"
          isLoading={cancel.isPending}
        />
      )}
    </div>
  );
}
