"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { paymentsApi } from "@/lib/payments-api";
import { usersApi } from "@/lib/users-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { parseOptionalNumber, refineNonNegativeMoney } from "@/lib/form-number";
import {
  CUSTOMER_BALANCE_QUERY_KEY,
  CUSTOMER_LEDGER_QUERY_KEY,
  PAYMENTS_DASHBOARD_QUERY_KEY,
  PAYMENTS_QUERY_KEY,
  USERS_QUERY_KEY,
} from "@/constants/query-keys";
import type { PaymentDetail } from "@/types/payments";
import type { PaymentMethod } from "@/types/delivery";

const METHODS: PaymentMethod[] = ["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"];

const schema = z
  .object({
    amount: z.string(),
    paymentDate: z.string().min(1, "Date is required"),
    method: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"]),
    collectedById: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    refineNonNegativeMoney(val.amount, "Amount", ctx, "amount", { required: true });
    const n = Number(val.amount?.trim() ?? "");
    if (Number.isFinite(n) && n <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be greater than zero",
        path: ["amount"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

interface EditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentDetail | null;
}

export function EditPaymentModal({ open, onClose, payment }: EditPaymentModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      paymentDate: "",
      method: "CASH",
      collectedById: "",
      reference: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open || !payment) return;
    reset({
      amount: String(payment.amount),
      paymentDate: toDateInput(payment.paymentDate),
      method: payment.method,
      collectedById: payment.collectedById ?? "",
      reference: payment.reference ?? "",
      notes: payment.notes ?? "",
    });
  }, [open, payment, reset]);

  const usersQuery = useQuery({
    queryKey: [USERS_QUERY_KEY, "payment-collectors"],
    queryFn: () => usersApi.list({ limit: 100, status: "ACTIVE" }),
    enabled: open,
  });
  const collectors = usersQuery.data?.data?.items ?? [];

  const save = useApiMutation(
    (values: FormValues) => {
      if (!payment) throw new Error("No payment");
      return paymentsApi.update(payment.id, {
        amount: parseOptionalNumber(values.amount) ?? 0,
        paymentDate: values.paymentDate,
        method: values.method,
        collectedById: values.collectedById || null,
        reference: values.reference?.trim() || null,
        notes: values.notes?.trim() || null,
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY] });
        if (payment) {
          qc.invalidateQueries({
            queryKey: [CUSTOMER_BALANCE_QUERY_KEY, payment.customerId],
          });
          qc.invalidateQueries({
            queryKey: [CUSTOMER_LEDGER_QUERY_KEY, payment.customerId],
          });
        }
        toast({ title: "Payment updated", variant: "success" });
        onClose();
      },
      onError: (err) => {
        setError("root", { message: getSafeErrorMessage(err) });
      },
    }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>Changing amount updates the customer ledger entry.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Customer">
            <Input
              disabled
              value={payment ? `${payment.customer.name} (${payment.customer.phone})` : ""}
            />
          </FormField>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Changing amount updates the linked customer ledger PAYMENT entry.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Amount" error={errors.amount?.message} required>
              <Input type="text" inputMode="decimal" placeholder="0.00" {...register("amount")} />
            </FormField>
            <FormField label="Date" error={errors.paymentDate?.message} required>
              <Input type="date" {...register("paymentDate")} />
            </FormField>
            <FormField label="Method" error={errors.method?.message} required>
              <Select {...register("method")}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Collected by" error={errors.collectedById?.message}>
              <Select {...register("collectedById")}>
                <option value="">— Optional —</option>
                {collectors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.firstName} ${u.lastName}`.trim() || u.email}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Reference" error={errors.reference?.message}>
              <Input placeholder="Receipt / txn ref" {...register("reference")} />
            </FormField>
            <FormField label="Notes" error={errors.notes?.message}>
              <Input placeholder="Optional notes" {...register("notes")} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
