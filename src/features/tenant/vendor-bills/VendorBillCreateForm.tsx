"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { localTodayYmd } from "@/lib/calendar-date";
import { vendorsApi } from "@/lib/vendors-api";
import { goodsReceiptsApi, purchaseOrdersApi } from "@/lib/purchase-orders-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PURCHASE_ORDERS_QUERY_KEY, VENDORS_QUERY_KEY } from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { GoodsReceiptDetail } from "@/types/purchase-orders";

type LineDraft = {
  key: string;
  description: string;
  qty: string;
  unitCost: string;
  purchaseOrderLineId?: string;
  goodsReceiptLineId?: string;
};

type FormInitial = {
  vendorId: string;
  purchaseOrderId: string;
  goodsReceiptId: string;
  billDate: string;
  notes: string;
  lines: LineDraft[];
};

function newLine(): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    qty: "1",
    unitCost: "0",
  };
}

function linesFromGrn(detail: GoodsReceiptDetail): LineDraft[] {
  return detail.lines.map((l) => ({
    key: l.id,
    description:
      l.purchaseOrderLine.product?.name ||
      l.purchaseOrderLine.rawMaterial?.name ||
      `Line #${l.purchaseOrderLine.lineNo}`,
    qty: String(l.qtyReceived),
    unitCost: String(l.purchaseOrderLine.unitCost ?? 0),
    purchaseOrderLineId: l.purchaseOrderLineId,
    goodsReceiptLineId: l.id,
  }));
}

function VendorBillCreateFormInner({ initial }: { initial?: FormInitial }) {
  const router = useRouter();
  const { toast } = useToast();
  const { enabled: poEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.PURCHASE_ORDERS);
  const [vendorId, setVendorId] = useState(initial?.vendorId ?? "");
  const [purchaseOrderId, setPurchaseOrderId] = useState(initial?.purchaseOrderId ?? "");
  const [goodsReceiptId, setGoodsReceiptId] = useState(initial?.goodsReceiptId ?? "");
  const [billDate, setBillDate] = useState(initial?.billDate ?? localTodayYmd());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines?.length ? initial.lines : [newLine()]
  );
  const [rootError, setRootError] = useState("");
  const [applyingGrn, setApplyingGrn] = useState(false);

  const vendorsQuery = useQuery({
    queryKey: [VENDORS_QUERY_KEY, "bill-form"],
    queryFn: () => vendorsApi.list({ isActive: true, limit: 100 }),
  });
  const vendors = vendorsQuery.data?.data?.items ?? [];

  const posQuery = useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, "bill-form", vendorId],
    queryFn: () =>
      purchaseOrdersApi.list({
        vendorId,
        limit: 50,
      }),
    enabled: !!vendorId && poEnabled,
  });
  const purchaseOrders = useMemo(
    () => posQuery.data?.data?.items ?? [],
    [posQuery.data?.data?.items]
  );

  const receiptsQuery = useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, "bill-receipts", purchaseOrderId],
    queryFn: () => purchaseOrdersApi.listReceipts(purchaseOrderId, { limit: 50 }),
    enabled: !!purchaseOrderId && poEnabled,
  });
  const receipts = receiptsQuery.data?.data?.items ?? [];

  const applyGrnDetail = async (grnId: string) => {
    setApplyingGrn(true);
    setRootError("");
    try {
      const res = await goodsReceiptsApi.get(grnId);
      const detail = res.data;
      if (!detail) throw new Error("Goods receipt not found");
      setGoodsReceiptId(detail.id);
      setPurchaseOrderId(detail.purchaseOrderId);
      setBillDate(detail.receiptDate?.slice?.(0, 10) || localTodayYmd());
      setNotes(detail.notes || "From goods receipt");
      setLines(linesFromGrn(detail));

      const fromList = purchaseOrders.find((p) => p.id === detail.purchaseOrderId);
      if (fromList) {
        setVendorId(fromList.vendorId);
      } else {
        const po = await purchaseOrdersApi.get(detail.purchaseOrderId);
        if (po.data?.vendorId) setVendorId(po.data.vendorId);
      }
    } catch (err) {
      setRootError(getSafeErrorMessage(err));
      setGoodsReceiptId("");
      setLines([newLine()]);
    } finally {
      setApplyingGrn(false);
    }
  };

  const save = useApiMutation(
    async () => {
      if (!vendorId) throw new Error("Select a vendor");

      // Prefer server-side GRN→bill (exact qty × PO cost, linked lines).
      if (goodsReceiptId) {
        return vendorBillsApi.createFromGoodsReceipt(goodsReceiptId);
      }

      const payloadLines = lines.map((l) => {
        if (!l.description.trim()) throw new Error("Line description required");
        const qty = Number(l.qty);
        const unitCost = Number(l.unitCost);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("Invalid qty");
        if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("Invalid unit cost");
        return {
          description: l.description.trim(),
          qty,
          unitCost,
          purchaseOrderLineId: l.purchaseOrderLineId || null,
          goodsReceiptLineId: l.goodsReceiptLineId || null,
        };
      });
      return vendorBillsApi.create({
        vendorId,
        billDate,
        dueDate: dueDate || null,
        purchaseOrderId: purchaseOrderId || null,
        goodsReceiptId: goodsReceiptId || null,
        notes: notes.trim() || null,
        lines: payloadLines,
      });
    },
    {
      onSuccess: (res) => {
        toast({ title: "Vendor bill created", variant: "success" });
        if (res.data?.id) router.push(`/vendor-bills/${res.data.id}`);
      },
      onError: (err) => setRootError(getSafeErrorMessage(err)),
    }
  );

  const fromReceipt = !!goodsReceiptId;

  return (
    <div className="space-y-6">
      {rootError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rootError}</p>
      )}

      {fromReceipt ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Lines are filled from the goods receipt (received qty × PO unit cost). Saving creates the
          payable bill for this receipt.
        </p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <FormField label="Vendor" required>
          <Select
            value={vendorId}
            onChange={(e) => {
              setVendorId(e.target.value);
              setPurchaseOrderId("");
              setGoodsReceiptId("");
              setLines([newLine()]);
            }}
          >
            <option value="">Select vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Bill date" required>
          <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
        </FormField>
        <FormField label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
        <FormField label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </FormField>
        {poEnabled && (
          <>
            <FormField label="Purchase order (optional)">
              <Select
                value={purchaseOrderId}
                onChange={(e) => {
                  setPurchaseOrderId(e.target.value);
                  setGoodsReceiptId("");
                  setLines([newLine()]);
                }}
                disabled={!vendorId}
              >
                <option value="">None</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber || po.id.slice(0, 8)} · {po.status.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Goods receipt (optional)">
              <Select
                value={goodsReceiptId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setGoodsReceiptId("");
                    setLines([newLine()]);
                    return;
                  }
                  void applyGrnDetail(id);
                }}
                disabled={!purchaseOrderId || applyingGrn}
              >
                <option value="">None</option>
                {receipts.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.receiptDate?.slice?.(0, 10) || r.id.slice(0, 8)}
                  </option>
                ))}
              </Select>
            </FormField>
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Lines</h3>
          {!fromReceipt ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((p) => [...p, newLine()])}
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          ) : null}
        </div>
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_90px_110px_40px]"
            >
              <Input
                placeholder="Description"
                value={line.description}
                readOnly={fromReceipt}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l))
                  )
                }
              />
              <Input
                type="number"
                step="any"
                placeholder="Qty"
                value={line.qty}
                readOnly={fromReceipt}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l))
                  )
                }
              />
              <Input
                type="number"
                step="any"
                placeholder="Unit cost"
                value={line.unitCost}
                readOnly={fromReceipt}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, unitCost: e.target.value } : l))
                  )
                }
              />
              {!fromReceipt ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={lines.length <= 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={save.isPending || applyingGrn}
          onClick={async () => {
            setRootError("");
            try {
              await save.mutateAsync();
            } catch (err) {
              if (err instanceof Error) setRootError(err.message);
            }
          }}
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create bill
        </Button>
      </div>
    </div>
  );
}

export function VendorBillCreateForm() {
  const searchParams = useSearchParams();
  const prefillsGrnId = searchParams.get("goodsReceiptId") || "";

  const grnDetailQuery = useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, "grn-detail", prefillsGrnId],
    queryFn: () => goodsReceiptsApi.get(prefillsGrnId),
    enabled: !!prefillsGrnId,
  });

  const poId = grnDetailQuery.data?.data?.purchaseOrderId ?? "";
  const poQuery = useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, "detail", poId],
    queryFn: () => purchaseOrdersApi.get(poId),
    enabled: !!poId,
  });

  if (prefillsGrnId) {
    if (grnDetailQuery.isLoading || (poId && poQuery.isLoading)) {
      return <div className="text-sm text-slate-500">Loading goods receipt…</div>;
    }
    const detail = grnDetailQuery.data?.data;
    const vendorId = poQuery.data?.data?.vendorId ?? "";
    if (!detail || !vendorId) {
      return (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load goods receipt for prefill.
        </p>
      );
    }
    const initial: FormInitial = {
      vendorId,
      purchaseOrderId: detail.purchaseOrderId,
      goodsReceiptId: detail.id,
      billDate: detail.receiptDate?.slice?.(0, 10) || localTodayYmd(),
      notes: detail.notes || "From goods receipt",
      lines: linesFromGrn(detail),
    };
    return <VendorBillCreateFormInner key={prefillsGrnId} initial={initial} />;
  }

  return <VendorBillCreateFormInner key="manual" />;
}
