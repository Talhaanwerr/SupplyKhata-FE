"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  VENDOR_BILL_DETAIL_QUERY_KEY,
  VENDOR_BILLS_QUERY_KEY,
  VENDOR_DETAIL_QUERY_KEY,
  VENDOR_DUES_QUERY_KEY,
  VENDOR_LEDGER_QUERY_KEY,
} from "@/constants/query-keys";
import { PayVendorBillModal } from "./PayVendorBillModal";

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function VendorBillDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [dueDraft, setDueDraft] = useState<string | null>(null);

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [VENDOR_BILL_DETAIL_QUERY_KEY, id],
    queryFn: () => vendorBillsApi.get(id),
    enabled: !!id,
  });

  const bill = res?.data;
  const dueValue = dueDraft ?? toDateInput(bill?.dueDate);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [VENDOR_BILLS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [VENDOR_BILL_DETAIL_QUERY_KEY, id] });
    qc.invalidateQueries({ queryKey: [VENDOR_DUES_QUERY_KEY] });
    if (bill?.vendorId) {
      qc.invalidateQueries({ queryKey: [VENDOR_DETAIL_QUERY_KEY, bill.vendorId] });
      qc.invalidateQueries({ queryKey: [VENDOR_LEDGER_QUERY_KEY, bill.vendorId] });
    }
  };

  const voidBill = useApiMutation(() => vendorBillsApi.void(id, "Voided from UI"), {
    onSuccess: () => {
      invalidate();
      toast({ title: "Bill voided", variant: "success" });
    },
    onError: (err) =>
      toast({
        title: "Could not void",
        description: getSafeErrorMessage(err),
        variant: "error",
      }),
  });

  const saveDue = useApiMutation(() => vendorBillsApi.setDueDate(id, dueValue), {
    onSuccess: () => {
      setDueDraft(null);
      invalidate();
      toast({ title: "Due date updated", variant: "success" });
    },
    onError: (err) =>
      toast({
        title: "Could not update due date",
        description: getSafeErrorMessage(err),
        variant: "error",
      }),
  });

  if (isLoading) return <div className="text-sm text-slate-500">Loading bill…</div>;
  if (isError || !bill) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Bill not found.</p>
        <Link href="/vendor-bills" className="text-sm underline">
          Back
        </Link>
      </div>
    );
  }

  const canPay = bill.status === "UNPAID" || bill.status === "PARTIALLY_PAID";
  const canVoid = bill.status !== "VOID" && bill.paidAmount === 0;
  const canEditDue = canPay;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vendor-bills"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Vendor bills
        </Link>
        <PageHeader
          title={bill.billNumber || "Vendor bill"}
          description={bill.vendor?.name ?? "Vendor bill"}
          action={
            <div className="flex flex-wrap gap-2">
              {canPay && (
                <PermissionGuard permission={PERMISSIONS.VENDOR_BILLS.PAY}>
                  <Button onClick={() => setPayOpen(true)}>
                    <Banknote className="h-4 w-4" />
                    Pay
                  </Button>
                </PermissionGuard>
              )}
              {canVoid && (
                <PermissionGuard permission={PERMISSIONS.VENDOR_BILLS.CREATE}>
                  <Button
                    variant="outline"
                    disabled={voidBill.isPending}
                    onClick={() => {
                      if (confirm("Void this unpaid bill?")) voidBill.mutate();
                    }}
                  >
                    Void
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
            <StatusBadge status={bill.status} />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Total</p>
          <p className="mt-1 text-sm font-semibold">{bill.totalAmount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Paid</p>
          <p className="mt-1 text-sm font-semibold">{bill.paidAmount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Remaining</p>
          <p className="mt-1 text-sm font-semibold">{bill.remaining.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Bill date</p>
          <p className="mt-1 text-sm font-semibold">
            {new Date(bill.billDate).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase">Due</p>
          {canEditDue ? (
            <PermissionGuard permission={PERMISSIONS.VENDOR_BILLS.UPDATE}>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="w-40"
                  value={dueValue}
                  onChange={(e) => setDueDraft(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!dueValue || saveDue.isPending}
                  onClick={() => saveDue.mutate()}
                >
                  Save
                </Button>
              </div>
            </PermissionGuard>
          ) : (
            <p className="mt-1 text-sm font-semibold">
              {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "—"}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-400 uppercase">Notes</p>
          <p className="mt-1 text-sm font-semibold">{bill.notes || "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold">Lines</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-slate-400 uppercase">
              <th className="py-2">#</th>
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit cost</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-2">{l.lineNo}</td>
                <td className="py-2">{l.description}</td>
                <td className="py-2">{l.qty}</td>
                <td className="py-2">{l.unitCost.toFixed(2)}</td>
                <td className="py-2">{l.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold">Payments</h3>
        {bill.payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bill.payments.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-sm">
                <span>
                  {new Date(p.paymentDate).toLocaleDateString()} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <span className="font-medium">{p.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PayVendorBillModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        bill={bill}
        onSuccess={invalidate}
      />
    </div>
  );
}
