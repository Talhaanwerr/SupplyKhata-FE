"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { invoicesApi } from "@/lib/invoices-api";
import { settingsApi } from "@/lib/settings-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  INVOICE_DETAIL_QUERY_KEY,
  INVOICES_QUERY_KEY,
  SETTINGS_QUERY_KEY,
  CUSTOMER_INVOICES_QUERY_KEY,
} from "@/constants/query-keys";
import type { InvoiceLine, InvoiceStatus } from "@/types/invoices";

function money(n: number, currency?: string) {
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function statusVariant(status: InvoiceStatus): "default" | "pending" | "success" | "cancelled" {
  switch (status) {
    case "DRAFT":
      return "pending";
    case "ISSUED":
      return "success";
    case "VOID":
      return "cancelled";
    default:
      return "default";
  }
}

function groupLines(lines: InvoiceLine[]) {
  const groups: Record<string, InvoiceLine[]> = {
    OPENING: [],
    DELIVERY: [],
    ORDER: [],
    PAYMENT: [],
    ADJUSTMENT: [],
    OTHER: [],
  };
  for (const line of lines) {
    if (line.lineType === "OPENING") groups.OPENING.push(line);
    else if (line.lineType === "DELIVERY") groups.DELIVERY.push(line);
    else if (line.lineType === "ORDER" || line.lineType === "ORDER_FEE") groups.ORDER.push(line);
    else if (line.lineType === "PAYMENT") groups.PAYMENT.push(line);
    else if (line.lineType === "ADJUSTMENT") groups.ADJUSTMENT.push(line);
    else groups.OTHER.push(line);
  }
  return groups;
}

function LineTable({
  title,
  lines,
  currency,
}: {
  title: string;
  lines: InvoiceLine[];
  currency: string;
}) {
  if (lines.length === 0) return null;
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-slate-50">
                <td className="px-4 py-2 text-slate-800">
                  {line.description}
                  {line.occurredAt && (
                    <span className="ml-2 text-xs text-slate-400">
                      {line.occurredAt.slice(0, 10)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{line.lineType}</td>
                <td className="px-4 py-2 text-slate-600">
                  {line.quantity != null ? line.quantity : "—"}
                </td>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {money(line.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function InvoiceDetailView() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [INVOICE_DETAIL_QUERY_KEY, invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: !!invoiceId,
  });

  const settingsQuery = useQuery({
    queryKey: [SETTINGS_QUERY_KEY],
    queryFn: settingsApi.get,
  });

  const invoice = res?.data;
  const settings = settingsQuery.data?.data;
  const groups = useMemo(() => (invoice ? groupLines(invoice.lines) : null), [invoice]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [INVOICE_DETAIL_QUERY_KEY, invoiceId] });
    qc.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [CUSTOMER_INVOICES_QUERY_KEY] });
  };

  const issue = useApiMutation(() => invoicesApi.issue(invoiceId), {
    onSuccess: () => {
      invalidate();
      toast({ title: "Invoice issued", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not issue",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  const voidInvoice = useApiMutation(
    () => invoicesApi.void(invoiceId, { reason: voidReason.trim() }),
    {
      onSuccess: () => {
        setVoidOpen(false);
        setVoidReason("");
        invalidate();
        toast({ title: "Invoice voided", variant: "success" });
      },
      onError: (err) => {
        toast({
          title: "Could not void",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  const deleteDraft = useApiMutation(() => invoicesApi.deleteDraft(invoiceId), {
    onSuccess: () => {
      setDeleteOpen(false);
      qc.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
      toast({ title: "Draft discarded", variant: "success" });
      router.push("/invoices");
    },
    onError: (err) => {
      toast({
        title: "Could not delete",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      await invoicesApi.downloadPdf(invoiceId);
      toast({ title: "PDF downloaded", variant: "success" });
    } catch (err) {
      toast({
        title: "PDF failed",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading invoice…</div>;
  }

  if (isError || !invoice || !groups) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Invoice not found.</p>
        <Link href="/invoices" className="text-sm text-slate-700 underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const orgName = settings?.orgName?.trim() || "SupplyKhata";
  const currency = invoice.currency || settings?.currency || "USD";
  const prefix = settings?.invoicePrefix ?? "";

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/invoices"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </Link>
        <PageHeader
          title={invoice.invoiceNumber ?? "Draft invoice"}
          description={`${invoice.customer.name} · ${invoice.periodStart} → ${invoice.periodEnd} (${invoice.periodType})`}
          action={
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={invoice.status} variant={statusVariant(invoice.status)} />
              {invoice.status === "DRAFT" && (
                <>
                  <PermissionGuard permission={PERMISSIONS.INVOICES.UPDATE}>
                    <Button type="button" onClick={() => issue.mutate()} disabled={issue.isPending}>
                      {issue.isPending ? "Issuing…" : "Issue"}
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard permission={PERMISSIONS.INVOICES.DELETE}>
                    <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                      Discard
                    </Button>
                  </PermissionGuard>
                </>
              )}
              {invoice.status === "ISSUED" && (
                <PermissionGuard permission={PERMISSIONS.INVOICES.VOID}>
                  <Button type="button" variant="outline" onClick={() => setVoidOpen(true)}>
                    Void
                  </Button>
                </PermissionGuard>
              )}
              {(invoice.status === "DRAFT" || invoice.status === "ISSUED") && (
                <>
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                  >
                    <Download className="h-4 w-4" />
                    {pdfLoading ? "PDF…" : "Download PDF"}
                  </Button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Summary */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 print:border-0 print:p-0">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Opening</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {money(invoice.openingBalance, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Sales</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {money(invoice.salesTotal, currency)}
          </p>
          <p className="text-xs text-slate-500">
            Del {money(invoice.deliveriesTotal)} · Ord {money(invoice.ordersTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Payments</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {money(invoice.paymentsTotal, currency)}
          </p>
        </div>
        {invoice.adjustmentsTotal !== 0 && (
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Adjustments
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {money(invoice.adjustmentsTotal, currency)}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Closing</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {money(invoice.closingBalance, currency)}
          </p>
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        <LineTable title="Opening" lines={groups.OPENING} currency={currency} />
        <LineTable title="Deliveries" lines={groups.DELIVERY} currency={currency} />
        <LineTable title="Orders" lines={groups.ORDER} currency={currency} />
        <LineTable title="Payments" lines={groups.PAYMENT} currency={currency} />
        <LineTable title="Adjustments" lines={groups.ADJUSTMENT} currency={currency} />
        <LineTable title="Other" lines={groups.OTHER} currency={currency} />
      </div>

      {invoice.notes && (
        <Card className="print:hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {invoice.status === "VOID" && invoice.voidReason && (
        <p className="text-sm text-amber-700 print:hidden">Void reason: {invoice.voidReason}</p>
      )}

      {/* Print-only layout */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-semibold">{orgName}</h1>
        {settings?.phone && <p className="text-sm">{settings.phone}</p>}
        {settings?.address && <p className="text-sm">{settings.address}</p>}
        <h2 className="mt-4 text-xl font-medium">
          {invoice.status === "DRAFT" ? "DRAFT INVOICE" : `Invoice ${invoice.invoiceNumber}`}
        </h2>
        {prefix && <p className="text-sm">Prefix: {prefix}</p>}
        <p className="mt-2 text-sm">
          {invoice.customer.name} · {invoice.customer.phone}
        </p>
        <p className="text-sm">
          Period ({invoice.periodType}): {invoice.periodStart} → {invoice.periodEnd}
        </p>
        <p className="text-sm">Currency: {currency}</p>
        <div className="mt-4 space-y-1 text-sm">
          <p>Opening: {money(invoice.openingBalance, currency)}</p>
          <p>Sales: {money(invoice.salesTotal, currency)}</p>
          <p>Payments: {money(invoice.paymentsTotal, currency)}</p>
          <p className="font-semibold">Closing: {money(invoice.closingBalance, currency)}</p>
        </div>
        <table className="mt-4 w-full text-left text-xs">
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.lineType}</td>
                <td>{line.description}</td>
                <td>{money(line.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-slate-500">Document only — does not post ledger.</p>
      </div>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void invoice</DialogTitle>
            <DialogDescription>
              Marks the invoice VOID. Does not reverse ledger entries.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Reason" required>
            <Input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Why is this invoice voided?"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVoidOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!voidReason.trim() || voidInvoice.isPending}
              onClick={() => voidInvoice.mutate()}
            >
              {voidInvoice.isPending ? "Voiding…" : "Void invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteDraft.mutate()}
        title="Discard draft"
        description="Delete this draft invoice? You can generate again for the same period."
        confirmLabel="Discard"
        isLoading={deleteDraft.isPending}
      />
    </div>
  );
}
