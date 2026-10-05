"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileSpreadsheet, PackageCheck, Printer, Send, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PermissionGuard } from "@/components/ui/permission-guard";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { purchaseOrdersApi } from "@/lib/purchase-orders-api";
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  INVENTORY_QUERY_KEY,
  PURCHASE_ORDER_DETAIL_QUERY_KEY,
  PURCHASE_ORDERS_QUERY_KEY,
  RAW_MATERIALS_QUERY_KEY,
  VENDOR_BILLS_QUERY_KEY,
  VENDORS_QUERY_KEY,
} from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { PurchaseOrderForm } from "./PurchaseOrderForm";
import { ReceiveGoodsModal } from "./ReceiveGoodsModal";

export function PurchaseOrderDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: billsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDOR_BILLS);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [billingReceiptId, setBillingReceiptId] = useState<string | null>(null);

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [PURCHASE_ORDER_DETAIL_QUERY_KEY, id],
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: !!id,
  });

  const receiptsQuery = useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, "receipts", id],
    queryFn: () => purchaseOrdersApi.listReceipts(id, { limit: 50 }),
    enabled: !!id,
  });

  const billsQuery = useQuery({
    queryKey: [VENDOR_BILLS_QUERY_KEY, "po", id],
    queryFn: () => vendorBillsApi.list({ purchaseOrderId: id, limit: 50 }),
    enabled: !!id && billsEnabled,
  });

  const po = res?.data;
  const receipts = receiptsQuery.data?.data?.items ?? [];
  const bills = billsQuery.data?.data?.items ?? [];
  const billByReceiptId = new Map(
    bills.filter((b) => b.goodsReceiptId).map((b) => [b.goodsReceiptId as string, b])
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [PURCHASE_ORDER_DETAIL_QUERY_KEY, id] });
    qc.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [RAW_MATERIALS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [VENDOR_BILLS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
  };

  const createBillFromReceipt = useApiMutation(
    (goodsReceiptId: string) => vendorBillsApi.createFromGoodsReceipt(goodsReceiptId),
    {
      onSuccess: (res) => {
        setBillingReceiptId(null);
        invalidate();
        toast({
          title: "Vendor bill created",
          description: res.data?.billNumber
            ? `${res.data.billNumber} · payable ${res.data.remaining.toFixed(2)}`
            : undefined,
          variant: "success",
        });
        if (res.data?.id) router.push(`/vendor-bills/${res.data.id}`);
      },
      onError: (err) => {
        setBillingReceiptId(null);
        toast({
          title: "Could not create bill",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  const send = useApiMutation(() => purchaseOrdersApi.send(id), {
    onSuccess: () => {
      invalidate();
      toast({ title: "Purchase order sent", variant: "success" });
    },
    onError: (err) =>
      toast({
        title: "Could not send",
        description: getSafeErrorMessage(err),
        variant: "error",
      }),
  });

  const cancel = useApiMutation(() => purchaseOrdersApi.cancel(id, cancelReason.trim()), {
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason("");
      invalidate();
      toast({ title: "Purchase order cancelled", variant: "success" });
    },
    onError: (err) =>
      toast({
        title: "Could not cancel",
        description: getSafeErrorMessage(err),
        variant: "error",
      }),
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading purchase order…</div>;
  }

  if (isError || !po) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Purchase order not found.</p>
        <Link href="/purchase-orders" className="text-sm underline">
          Back
        </Link>
      </div>
    );
  }

  const isDraft = po.status === "DRAFT";
  const canReceive = po.status === "SENT" || po.status === "PARTIALLY_RECEIVED";
  const canCancel = po.status !== "RECEIVED" && po.status !== "CANCELLED";

  const actions = (
    <div className="flex flex-wrap gap-2 print:hidden">
      {!isDraft && (
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      )}
      {isDraft && (
        <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS.UPDATE}>
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        </PermissionGuard>
      )}
      {canReceive && (
        <PermissionGuard permission={PERMISSIONS.GRN.CREATE}>
          <Button onClick={() => setReceiveOpen(true)}>
            <PackageCheck className="h-4 w-4" />
            Receive
          </Button>
        </PermissionGuard>
      )}
      {canCancel && (
        <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS.CANCEL}>
          <Button variant="outline" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-4 w-4" />
            Cancel PO
          </Button>
        </PermissionGuard>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/purchase-orders"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Purchase orders
        </Link>
        <PageHeader
          title={po.poNumber || (isDraft ? "Draft PO" : "Purchase order")}
          description={
            isDraft ? "Edit draft lines, then send to vendor" : `Vendor: ${po.vendor.name}`
          }
          action={actions}
        />
      </div>

      {isDraft ? (
        <PurchaseOrderForm key={po.id} existing={po} />
      ) : (
        <>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{po.poNumber}</h2>
                <p className="text-sm text-slate-600">{po.vendor.name}</p>
                {po.vendor.phone && <p className="text-sm text-slate-500">{po.vendor.phone}</p>}
              </div>
              <StatusBadge status={po.status} />
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400 uppercase">Expected</p>
                <p className="font-medium">
                  {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Created</p>
                <p className="font-medium">{new Date(po.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Notes</p>
                <p className="font-medium">{po.notes || "—"}</p>
              </div>
            </div>

            {po.cancelReason && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Cancelled: {po.cancelReason}
              </p>
            )}

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                  <th className="py-2">#</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Ordered</th>
                  <th className="py-2">Received</th>
                  <th className="py-2">Unit cost</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2">{l.lineNo}</td>
                    <td className="py-2">
                      {l.product?.name || l.rawMaterial?.name}
                      <span className="ml-1 text-xs text-slate-400">
                        {l.productId ? "product" : "raw"}
                      </span>
                    </td>
                    <td className="py-2">{l.qtyOrdered}</td>
                    <td className="py-2">{l.qtyReceived}</td>
                    <td className="py-2">{l.unitCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 print:hidden">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Goods receipts</h3>
            {receipts.length === 0 ? (
              <p className="text-sm text-slate-500">No receipts yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {receipts.map((r) => {
                  const linkedBill = billByReceiptId.get(r.id);
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span>
                        {new Date(r.receiptDate).toLocaleDateString()} · {r.location.name} ·{" "}
                        {r.lineCount} line(s)
                        <span className="ml-2 text-slate-500">
                          by {r.receivedBy.firstName} {r.receivedBy.lastName}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {linkedBill ? (
                          <Link
                            href={`/vendor-bills/${linkedBill.id}`}
                            className="text-slate-700 underline"
                          >
                            {linkedBill.billNumber || "Bill"} · {linkedBill.remaining.toFixed(2)}{" "}
                            due
                          </Link>
                        ) : billsEnabled ? (
                          <PermissionGuard permission={PERMISSIONS.VENDOR_BILLS.CREATE}>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                createBillFromReceipt.isPending && billingReceiptId === r.id
                              }
                              onClick={() => {
                                setBillingReceiptId(r.id);
                                createBillFromReceipt.mutate(r.id);
                              }}
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                              Create bill
                            </Button>
                          </PermissionGuard>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {billsEnabled && bills.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 print:hidden">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Vendor bills</h3>
              <ul className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <li key={b.id} className="flex justify-between py-2 text-sm">
                    <Link href={`/vendor-bills/${b.id}`} className="font-medium underline">
                      {b.billNumber || b.id.slice(0, 8)}
                    </Link>
                    <span className="text-slate-600">
                      {b.status.replace(/_/g, " ")} · remaining {b.remaining.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <ReceiveGoodsModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        purchaseOrder={po}
        onSuccess={invalidate}
      />

      <Dialog open={cancelOpen} onOpenChange={(v) => !v && setCancelOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel purchase order</DialogTitle>
            <DialogDescription>
              Provide a reason. Already received stock is not reversed.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Cancel reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep PO
            </Button>
            <Button
              disabled={!cancelReason.trim() || cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Cancel PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
