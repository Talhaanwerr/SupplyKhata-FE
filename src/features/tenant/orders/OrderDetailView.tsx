"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Printer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { OrderForm } from "@/features/tenant/orders/OrderForm";
import { ordersApi } from "@/lib/orders-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INT_RE, MONEY_RE, QTY_RE, parseOptionalNumber } from "@/lib/form-number";
import { PERMISSIONS } from "@/constants/permissions";
import { ORDER_DETAIL_QUERY_KEY, ORDERS_QUERY_KEY } from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { OrderPaymentStatus, OrderStatus, OrderTimelineEvent } from "@/types/orders";
import type { PaymentMethod } from "@/types/delivery";
import { baseUnitLabel, needsExplicitPackagingCount } from "@/types/products";
import type { ProductBaseUnit } from "@/types/products";

const METHODS: PaymentMethod[] = ["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"];

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function userLabel(u: { firstName: string; lastName: string; email: string } | null | undefined) {
  if (!u) return "—";
  const name = `${u.firstName} ${u.lastName}`.trim();
  return name || u.email;
}

function fulfillmentVariant(
  status: OrderStatus
): "default" | "pending" | "trial" | "warning" | "success" | "cancelled" | "error" {
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

function invalidateOrder(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
  qc.invalidateQueries({ queryKey: [ORDER_DETAIL_QUERY_KEY, id] });
}

export function OrderDetailView() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: containersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS);

  const [editingDraft, setEditingDraft] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const [deliverQty, setDeliverQty] = useState<Record<string, string>>({});
  const [deliverCans, setDeliverCans] = useState<Record<string, string>>({});
  const [deliverEmpties, setDeliverEmpties] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const orderQuery = useQuery({
    queryKey: [ORDER_DETAIL_QUERY_KEY, orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: !!orderId,
  });

  const timelineQuery = useQuery({
    queryKey: [ORDER_DETAIL_QUERY_KEY, orderId, "timeline"],
    queryFn: () => ordersApi.timeline(orderId),
    enabled: !!orderId,
  });

  const order = orderQuery.data?.data;
  const timeline = timelineQuery.data?.data ?? ([] as OrderTimelineEvent[]);

  const place = useApiMutation(() => ordersApi.place(orderId), {
    onSuccess: () => {
      invalidateOrder(qc, orderId);
      toast({ title: "Order placed", variant: "success" });
    },
    onError: (err) =>
      toast({ title: "Could not place", description: getSafeErrorMessage(err), variant: "error" }),
  });

  const ship = useApiMutation(() => ordersApi.ship(orderId), {
    onSuccess: () => {
      invalidateOrder(qc, orderId);
      toast({ title: "Order shipped", variant: "success" });
    },
    onError: (err) =>
      toast({ title: "Could not ship", description: getSafeErrorMessage(err), variant: "error" }),
  });

  const deliver = useApiMutation(
    () => {
      if (!order) throw new Error("Order not loaded");
      const items = order.items
        .map((item) => {
          const raw = deliverQty[item.productId]?.trim() ?? "";
          const quantityDelivered = Number(raw);
          const track = containersEnabled && item.product.isReturnable;
          const needsCans = track && needsExplicitPackagingCount(item.product);
          const cansRaw = deliverCans[item.productId]?.trim() ?? "";
          const emptiesRaw = deliverEmpties[item.productId]?.trim() ?? "";
          return {
            productId: item.productId,
            quantityDelivered,
            raw,
            track,
            needsCans,
            cansRaw,
            emptiesRaw,
            line: item,
          };
        })
        .filter(
          (i) => i.raw !== "" && Number.isFinite(i.quantityDelivered) && i.quantityDelivered > 0
        )
        .map((row) => {
          const remaining = row.line.quantity - row.line.quantityDelivered;
          if (row.quantityDelivered > remaining + 1e-9) {
            throw new Error(`Cannot deliver more than remaining for ${row.line.product.name}`);
          }
          if (!QTY_RE.test(String(row.quantityDelivered))) {
            throw new Error("Qty can have at most 3 decimal places");
          }
          let containersDelivered: number | undefined;
          if (row.needsCans) {
            if (!INT_RE.test(row.cansRaw) || Number(row.cansRaw) < 1) {
              throw new Error(
                `Enter cans given for "${row.line.product.name}" (litres/kg is not the can count)`
              );
            }
            containersDelivered = Number(row.cansRaw);
          }
          let emptiesReceived: number | undefined;
          if (row.track) {
            const empties = row.emptiesRaw === "" ? 0 : Number(row.emptiesRaw);
            if (row.emptiesRaw !== "" && (!INT_RE.test(row.emptiesRaw) || empties < 0)) {
              throw new Error(`Empties must be a whole number for ${row.line.product.name}`);
            }
            emptiesReceived = empties;
          }
          return {
            productId: row.productId,
            quantityDelivered: row.quantityDelivered,
            ...(containersDelivered != null ? { containersDelivered } : {}),
            ...(emptiesReceived != null ? { emptiesReceived } : {}),
          };
        });
      if (items.length === 0) throw new Error("Enter at least one incremental qty to deliver");
      return ordersApi.deliver(orderId, { items });
    },
    {
      onSuccess: () => {
        invalidateOrder(qc, orderId);
        setDeliverOpen(false);
        setDeliverQty({});
        setDeliverCans({});
        setDeliverEmpties({});
        toast({ title: "Delivery recorded", variant: "success" });
      },
      onError: (err) =>
        toast({
          title: "Could not deliver",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  const cancel = useApiMutation(
    () => {
      const reason = cancelReason.trim();
      if (!reason) throw new Error("Cancel reason is required");
      return ordersApi.cancel(orderId, { reason });
    },
    {
      onSuccess: () => {
        invalidateOrder(qc, orderId);
        setCancelOpen(false);
        setCancelReason("");
        toast({ title: "Order cancelled", variant: "success" });
      },
      onError: (err) =>
        toast({
          title: "Could not cancel",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  const recordPayment = useApiMutation(
    () => {
      const amount = parseOptionalNumber(payAmount);
      if (amount == null || amount <= 0) throw new Error("Amount must be greater than zero");
      if (!MONEY_RE.test(payAmount.trim())) throw new Error("Amount can have at most 2 decimals");
      return ordersApi.payment(orderId, { method: payMethod, amount });
    },
    {
      onSuccess: () => {
        invalidateOrder(qc, orderId);
        setPaymentOpen(false);
        setPayAmount("");
        setPayMethod("CASH");
        toast({ title: "Payment recorded", variant: "success" });
      },
      onError: (err) =>
        toast({
          title: "Could not record payment",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  const refund = useApiMutation(
    () => {
      if (!order) throw new Error("Order not loaded");
      const reason = refundReason.trim();
      if (!reason) throw new Error("Refund reason is required");
      if (order.amountPaid <= 0) throw new Error("Nothing to refund");
      return ordersApi.refund(orderId, { amount: order.amountPaid, reason });
    },
    {
      onSuccess: () => {
        invalidateOrder(qc, orderId);
        setRefundOpen(false);
        setRefundReason("");
        toast({ title: "Order refunded", variant: "success" });
      },
      onError: (err) =>
        toast({
          title: "Could not refund",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  const openLines = useMemo(
    () => (order?.items ?? []).filter((i) => i.quantityDelivered < i.quantity),
    [order]
  );

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading order…
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={ShoppingCart}
          title="Order not found"
          description="This order may have been deleted or you do not have access."
        />
        <Link href="/orders" className="text-sm underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (editingDraft && order.status === "DRAFT") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Edit draft #${order.orderNumber}`}
          description="Update lines and totals, then save or place."
        />
        <OrderForm order={order} />
        <Button type="button" variant="outline" onClick={() => setEditingDraft(false)}>
          Cancel editing
        </Button>
      </div>
    );
  }

  const canPlace = order.status === "DRAFT";
  const canShip = order.status === "PLACED";
  const canDeliver = order.status === "SHIPPED" || order.status === "PARTIALLY_DELIVERED";
  const canCancel =
    (order.status === "DRAFT" || order.status === "PLACED") && order.amountPaid <= 0;
  const canPay = order.amountDue > 0 && !["DRAFT", "CANCELLED", "REFUNDED"].includes(order.status);
  const canRefund =
    order.amountPaid > 0 && !["DRAFT", "CANCELLED", "REFUNDED"].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
        <div className="flex flex-wrap gap-2">
          {canPlace && (
            <PermissionGuard permission={PERMISSIONS.ORDERS.UPDATE}>
              <Button type="button" variant="outline" onClick={() => setEditingDraft(true)}>
                <Pencil className="h-4 w-4" />
                Edit draft
              </Button>
              <Button type="button" disabled={place.isPending} onClick={() => place.mutate()}>
                {place.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Place
              </Button>
            </PermissionGuard>
          )}
          {canShip && (
            <PermissionGuard permission={PERMISSIONS.ORDERS.UPDATE}>
              <Button type="button" disabled={ship.isPending} onClick={() => ship.mutate()}>
                {ship.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Ship
              </Button>
            </PermissionGuard>
          )}
          {canDeliver && (
            <PermissionGuard permission={PERMISSIONS.ORDERS.UPDATE}>
              <Button
                type="button"
                onClick={() => {
                  const initialQty: Record<string, string> = {};
                  const initialCans: Record<string, string> = {};
                  const initialEmpties: Record<string, string> = {};
                  for (const item of openLines) {
                    const rem = item.quantity - item.quantityDelivered;
                    initialQty[item.productId] = String(rem);
                    const track = containersEnabled && item.product.isReturnable;
                    if (track && needsExplicitPackagingCount(item.product)) {
                      const plannedRemaining =
                        item.quantityDelivered === 0 && item.containersDelivered > 0
                          ? item.containersDelivered
                          : "";
                      initialCans[item.productId] =
                        plannedRemaining !== "" ? String(plannedRemaining) : "";
                    }
                    if (track) initialEmpties[item.productId] = "0";
                  }
                  setDeliverQty(initialQty);
                  setDeliverCans(initialCans);
                  setDeliverEmpties(initialEmpties);
                  setDeliverOpen(true);
                }}
              >
                Deliver
              </Button>
            </PermissionGuard>
          )}
          {canPay && (
            <PermissionGuard permission={PERMISSIONS.ORDERS.UPDATE}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPayAmount(String(order.amountDue));
                  setPaymentOpen(true);
                }}
              >
                Record payment
              </Button>
            </PermissionGuard>
          )}
          {canRefund && (
            <PermissionGuard permission={PERMISSIONS.ORDERS.REFUND}>
              <Button type="button" variant="outline" onClick={() => setRefundOpen(true)}>
                Refund
              </Button>
            </PermissionGuard>
          )}
          {canCancel && (
            <PermissionGuard permission={PERMISSIONS.ORDERS.CANCEL}>
              <Button type="button" variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            </PermissionGuard>
          )}
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print slip
          </Button>
        </div>
      </div>

      <PageHeader
        title={`Order #${order.orderNumber}`}
        description={`${order.customer.name} · ${order.customer.phone}`}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.status} variant={fulfillmentVariant(order.status)} />
            <StatusBadge
              status={order.paymentStatus}
              variant={paymentVariant(order.paymentStatus)}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 print:grid-cols-1">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Ordered</th>
                  <th className="py-2 pr-3 font-medium">Delivered</th>
                  <th className="py-2 pr-3 font-medium">Remaining</th>
                  {containersEnabled && (
                    <>
                      <th className="py-2 pr-3 font-medium">Cans</th>
                      <th className="py-2 pr-3 font-medium">Empties</th>
                    </>
                  )}
                  <th className="py-2 pr-3 font-medium">Unit</th>
                  <th className="py-2 font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const remaining = Math.max(0, item.quantity - item.quantityDelivered);
                  const unit = item.product.baseUnit as ProductBaseUnit;
                  const showCans = containersEnabled && item.product.isReturnable;
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-900">{item.product.name}</td>
                      <td className="py-2 pr-3">
                        {item.quantity} {baseUnitLabel(unit)}
                      </td>
                      <td className="py-2 pr-3">{item.quantityDelivered}</td>
                      <td className="py-2 pr-3">{remaining}</td>
                      {containersEnabled && (
                        <>
                          <td className="py-2 pr-3">{showCans ? item.containersDelivered : "—"}</td>
                          <td className="py-2 pr-3">{showCans ? item.emptiesReceived : "—"}</td>
                        </>
                      )}
                      <td className="py-2 pr-3">{money(item.unitPriceSnapshot)}</td>
                      <td className="py-2">{money(item.lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Money</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <MoneyRow label="Subtotal" value={order.subtotal} />
            <MoneyRow label="Discount" value={-order.discountTotal} />
            <MoneyRow label="Delivery charges" value={order.deliveryCharges} />
            <div className="border-t border-slate-200 pt-2">
              <MoneyRow label="Total" value={order.total} bold />
            </div>
            <MoneyRow label="Paid" value={order.amountPaid} />
            <MoneyRow label="Due" value={order.amountDue} bold />
            {order.refundAmount != null && order.refundAmount > 0 && (
              <MoneyRow label="Refunded" value={order.refundAmount} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Shipping & notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="text-slate-400">Address:</span> {order.shippingAddress || "—"}
            </p>
            <p>
              <span className="text-slate-400">Shipping notes:</span> {order.shippingNotes || "—"}
            </p>
            <p>
              <span className="text-slate-400">Internal notes:</span> {order.internalNotes || "—"}
            </p>
            <p>
              <span className="text-slate-400">Preferred ship:</span>{" "}
              {order.preferredShipDate || "—"}
            </p>
            <p>
              <span className="text-slate-400">Created by:</span> {userLabel(order.createdBy)}
            </p>
            {order.cancelReason && (
              <p>
                <span className="text-slate-400">Cancel reason:</span> {order.cancelReason}
              </p>
            )}
            {order.refundReason && (
              <p>
                <span className="text-slate-400">Refund reason:</span> {order.refundReason}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {order.payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span>
                      {p.method} · {formatDateTime(p.paidAt)}
                    </span>
                    <span className="font-medium">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading timeline…</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No status events yet.</p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <div className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {ev.fromStatus ? `${ev.fromStatus} → ${ev.toStatus}` : ev.toStatus}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(ev.at)} · {userLabel(ev.by)}
                      {ev.note ? ` · ${ev.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Print-only slip */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-semibold">Order #{order.orderNumber}</h1>
        <p className="mt-1 text-sm">
          {order.customer.name} · {order.customer.phone}
        </p>
        <p className="text-sm">
          {order.status} · {order.paymentStatus} · Total {money(order.total)}
        </p>
        {order.shippingAddress && <p className="mt-2 text-sm">Ship to: {order.shippingAddress}</p>}
      </div>

      {/* Deliver dialog */}
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record delivery</DialogTitle>
            <DialogDescription>
              Enter incremental quantity handed off now (not absolute totals). Remaining qty is
              prefilled.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-4 overflow-y-auto">
            {openLines.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing left to deliver.</p>
            ) : (
              openLines.map((item) => {
                const remaining = item.quantity - item.quantityDelivered;
                const track = containersEnabled && item.product.isReturnable;
                const needsCans = track && needsExplicitPackagingCount(item.product);
                return (
                  <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">
                      {item.product.name}{" "}
                      <span className="font-normal text-slate-500">(remaining {remaining})</span>
                    </p>
                    <div
                      className={`grid gap-2 ${
                        track ? (needsCans ? "sm:grid-cols-3" : "sm:grid-cols-2") : ""
                      }`}
                    >
                      <FormField
                        label={`Qty (${baseUnitLabel(item.product.baseUnit as ProductBaseUnit)})`}
                      >
                        <Input
                          value={deliverQty[item.productId] ?? ""}
                          onChange={(e) =>
                            setDeliverQty((prev) => ({
                              ...prev,
                              [item.productId]: e.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      </FormField>
                      {needsCans && (
                        <FormField label="Cans given">
                          <Input
                            inputMode="numeric"
                            value={deliverCans[item.productId] ?? ""}
                            onChange={(e) =>
                              setDeliverCans((prev) => ({
                                ...prev,
                                [item.productId]: e.target.value,
                              }))
                            }
                            placeholder="e.g. 1"
                          />
                        </FormField>
                      )}
                      {track && (
                        <FormField label="Empties received">
                          <Input
                            inputMode="numeric"
                            value={deliverEmpties[item.productId] ?? ""}
                            onChange={(e) =>
                              setDeliverEmpties((prev) => ({
                                ...prev,
                                [item.productId]: e.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                        </FormField>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeliverOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={deliver.isPending || openLines.length === 0}
              onClick={() => deliver.mutate()}
            >
              {deliver.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order?</DialogTitle>
            <DialogDescription>
              Provide a reason. Paid orders must be refunded first.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Reason" required>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Customer cancelled"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancel.isPending || !cancelReason.trim()}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Amount due: {money(order.amountDue)}. Payment methods: CASH, BANK, EASYPAISA,
              JAZZCASH, OTHER.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Method" required>
            <Select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount" required>
            <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={recordPayment.isPending}
              onClick={() => recordPayment.mutate()}
            >
              {recordPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full refund</DialogTitle>
            <DialogDescription>
              v1 supports full refund only. Amount will be {money(order.amountPaid)} (current amount
              paid).
            </DialogDescription>
          </DialogHeader>
          <FormField label="Reason" required>
            <Input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Customer returned goods"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={refund.isPending || !refundReason.trim()}
              onClick={() => refund.mutate()}
            >
              {refund.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Refund {money(order.amountPaid)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoneyRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}
    >
      <span className={bold ? undefined : "text-slate-500"}>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}
