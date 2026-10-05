"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { inventoryApi } from "@/lib/inventory-api";
import { localTodayYmd } from "@/lib/calendar-date";
import { purchaseOrdersApi } from "@/lib/purchase-orders-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INVENTORY_QUERY_KEY } from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { pickDefaultLocationId } from "@/lib/location-default";
import type { PurchaseOrderDetail } from "@/types/purchase-orders";

function initialQtys(purchaseOrder: PurchaseOrderDetail): Record<string, string> {
  const init: Record<string, string> = {};
  for (const l of purchaseOrder.lines) {
    init[l.id] = l.remaining > 0 ? String(l.remaining) : "0";
  }
  return init;
}

function ReceiveGoodsForm({
  purchaseOrder,
  onClose,
  onSuccess,
}: {
  purchaseOrder: PurchaseOrderDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { enabled: inventoryEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.INVENTORY);
  const { enabled: warehouseEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.WAREHOUSE);
  const { enabled: billsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDOR_BILLS);
  const [locationId, setLocationId] = useState("");
  const [receiptDate, setReceiptDate] = useState(localTodayYmd);
  const [billDueDate, setBillDueDate] = useState(localTodayYmd);
  const [notes, setNotes] = useState("");
  const [qtys, setQtys] = useState(() => initialQtys(purchaseOrder));

  const receivable = purchaseOrder.lines.filter((l) => l.remaining > 0);

  const locationsQuery = useQuery({
    queryKey: [INVENTORY_QUERY_KEY, "locations", "grn"],
    queryFn: () => inventoryApi.listLocations({ isActive: true }),
    enabled: inventoryEnabled,
  });
  const locations = useMemo(() => locationsQuery.data?.data ?? [], [locationsQuery.data?.data]);
  const effectiveLocationId = locationId || pickDefaultLocationId(locations);
  const showLocation = inventoryEnabled && (warehouseEnabled || locations.length > 1);

  const mutation = useApiMutation(
    async () => {
      const lines = receivable
        .map((l) => ({
          purchaseOrderLineId: l.id,
          qtyReceived: Number(qtys[l.id] || 0),
        }))
        .filter((l) => l.qtyReceived > 0);

      if (!lines.length) throw new Error("Enter at least one quantity to receive");

      for (const line of lines) {
        const poLine = purchaseOrder.lines.find((l) => l.id === line.purchaseOrderLineId);
        if (poLine && line.qtyReceived > poLine.remaining + 1e-9) {
          const name = poLine.product?.name || poLine.rawMaterial?.name || `line #${poLine.lineNo}`;
          throw new Error(
            `Cannot receive ${line.qtyReceived} of "${name}" — only ${poLine.remaining} remaining on this PO`
          );
        }
      }

      return purchaseOrdersApi.createReceipt(purchaseOrder.id, {
        locationId: showLocation && effectiveLocationId ? effectiveLocationId : undefined,
        receiptDate,
        notes: notes.trim() || null,
        billDueDate: billsEnabled ? billDueDate || receiptDate : undefined,
        lines,
      });
    },
    {
      onSuccess: (res) => {
        const bill = res.data?.vendorBill;
        const billErr = res.data?.vendorBillError;
        if (bill) {
          toast({
            title: "Goods received · Vendor bill created",
            description: `${bill.billNumber || "Bill"} · payable ${bill.remaining.toFixed(2)}`,
            variant: "success",
          });
        } else if (billsEnabled && billErr) {
          toast({
            title: "Goods received",
            description: `Stock posted, but bill failed: ${billErr}. Create bill from the receipt list.`,
            variant: "success",
          });
        } else {
          toast({
            title: "Goods received",
            description: billsEnabled
              ? undefined
              : "Enable Vendor Bills to auto-create payables on receive.",
            variant: "success",
          });
        }
        onSuccess();
        onClose();
      },
      onError: (err) =>
        toast({
          title: "Could not receive",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Receive goods — {purchaseOrder.poNumber}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <FormField label="Receipt date" required>
          <Input
            type="date"
            value={receiptDate}
            onChange={(e) => {
              setReceiptDate(e.target.value);
              if (!billDueDate || billDueDate < e.target.value) {
                setBillDueDate(e.target.value);
              }
            }}
          />
        </FormField>
        {billsEnabled ? (
          <FormField label="Bill due date" required>
            <Input
              type="date"
              value={billDueDate}
              min={receiptDate}
              onChange={(e) => setBillDueDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Payable amount for this receipt will be due on this date (shows under Payables Due).
            </p>
          </FormField>
        ) : null}
        {showLocation && (
          <FormField label="Location">
            <Select value={effectiveLocationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Default location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">Lines</p>
          {receivable.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing left to receive.</p>
          ) : (
            receivable.map((l) => {
              const name = l.product?.name || l.rawMaterial?.name || "Item";
              return (
                <div
                  key={l.id}
                  className="grid grid-cols-[1fr_100px] items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      #{l.lineNo} {name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Remaining {l.remaining} (ordered {l.qtyOrdered})
                    </p>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max={l.remaining}
                    value={qtys[l.id] ?? ""}
                    onChange={(e) => setQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={mutation.isPending || receivable.length === 0}
          onClick={() => mutation.mutate()}
        >
          Post receipt
        </Button>
      </DialogFooter>
    </>
  );
}

export function ReceiveGoodsModal({
  open,
  onClose,
  purchaseOrder,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderDetail;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        {open ? (
          <ReceiveGoodsForm
            key={purchaseOrder.id}
            purchaseOrder={purchaseOrder}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
