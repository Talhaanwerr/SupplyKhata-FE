"use client";

import { useState } from "react";
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
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { localTodayYmd } from "@/lib/calendar-date";
import { getSafeErrorMessage } from "@/lib/safe-error";
import type { PaymentMethod, VendorBillDetail } from "@/types/vendor-bills";

const METHODS: PaymentMethod[] = ["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"];

function PayVendorBillForm({
  bill,
  onClose,
  onSuccess,
}: {
  bill: VendorBillDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(String(bill.remaining));
  const [paymentDate, setPaymentDate] = useState(localTodayYmd());
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");

  const mutation = useApiMutation(
    () =>
      vendorBillsApi.pay(bill.id, {
        amount: Number(amount),
        paymentDate,
        method,
        reference: reference.trim() || null,
      }),
    {
      onSuccess: () => {
        toast({ title: "Payment recorded", variant: "success" });
        onSuccess();
        onClose();
      },
      onError: (err) =>
        toast({
          title: "Could not pay",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pay vendor bill</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Remaining: <strong>{bill.remaining.toFixed(2)}</strong>
        </p>
        <FormField label="Amount" required>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <FormField label="Payment date" required>
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </FormField>
        <FormField label="Method" required>
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
          />
        </FormField>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Record payment
        </Button>
      </DialogFooter>
    </>
  );
}

export function PayVendorBillModal({
  open,
  onClose,
  bill,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  bill: VendorBillDetail;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {open ? (
          <PayVendorBillForm
            key={`${bill.id}-${bill.remaining}`}
            bill={bill}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
