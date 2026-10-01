"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { CustomerSearchSelect } from "@/features/tenant/customers/CustomerSearchSelect";
import { invoicesApi } from "@/lib/invoices-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INVOICES_QUERY_KEY, INVOICE_DETAIL_QUERY_KEY } from "@/constants/query-keys";
import { INVOICE_PERIOD_TYPES, type InvoicePeriodType } from "@/types/invoices";

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolvePeriod(
  periodType: InvoicePeriodType,
  anchor: string
): { periodStart: string; periodEnd: string } {
  const base = anchor ? new Date(anchor + "T12:00:00") : new Date();
  if (periodType === "WEEKLY") {
    const mon = mondayOf(base);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { periodStart: toYmd(mon), periodEnd: toYmd(sun) };
  }
  if (periodType === "MONTHLY") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { periodStart: toYmd(start), periodEnd: toYmd(end) };
  }
  return { periodStart: anchor || toYmd(base), periodEnd: anchor || toYmd(base) };
}

interface GenerateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefill customer (e.g. from customer detail). */
  initialCustomerId?: string;
}

export function GenerateInvoiceDialog({
  open,
  onClose,
  initialCustomerId = "",
}: GenerateInvoiceDialogProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [periodType, setPeriodType] = useState<InvoicePeriodType>("MONTHLY");
  const [anchorDate, setAnchorDate] = useState(toYmd(new Date()));
  const [customStart, setCustomStart] = useState(toYmd(new Date()));
  const [customEnd, setCustomEnd] = useState(toYmd(new Date()));
  const [notes, setNotes] = useState("");

  const resolved = useMemo(() => {
    if (periodType === "CUSTOM") {
      return { periodStart: customStart, periodEnd: customEnd };
    }
    return resolvePeriod(periodType, anchorDate);
  }, [periodType, anchorDate, customStart, customEnd]);

  const generate = useMutation({
    mutationFn: () =>
      invoicesApi.generate({
        customerId,
        periodType,
        periodStart: resolved.periodStart,
        periodEnd: resolved.periodEnd,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (res) => {
      const inv = res.data;
      qc.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
      if (inv?.id) {
        qc.setQueryData([INVOICE_DETAIL_QUERY_KEY, inv.id], res);
      }
      toast({ title: "Draft invoice generated", variant: "success" });
      onClose();
      if (inv?.id) router.push(`/invoices/${inv.id}`);
    },
    onError: (err) => {
      toast({
        title: "Could not generate invoice",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate invoice</DialogTitle>
          <DialogDescription>
            Builds a DRAFT period statement from deliveries, orders, and payments. Does not post
            ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Customer" required>
            <CustomerSearchSelect
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              allowCreate={false}
            />
          </FormField>

          <FormField label="Period type" required>
            <Select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as InvoicePeriodType)}
            >
              {INVOICE_PERIOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>

          {periodType === "CUSTOM" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Period start" required>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </FormField>
              <FormField label="Period end" required>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </FormField>
            </div>
          ) : (
            <FormField label={periodType === "WEEKLY" ? "Week of" : "Month of"} required>
              <Input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
              />
            </FormField>
          )}

          <p className="text-xs text-slate-500">
            Resolved range: {resolved.periodStart} → {resolved.periodEnd} (Asia/Karachi date-only)
          </p>

          <FormField label="Notes">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={generate.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !customerId || generate.isPending || !resolved.periodStart || !resolved.periodEnd
            }
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? "Generating…" : "Generate draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
