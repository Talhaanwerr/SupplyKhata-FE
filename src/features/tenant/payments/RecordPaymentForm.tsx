"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { paymentsApi } from "@/lib/payments-api";
import { customersApi } from "@/lib/customers-api";
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
import type { PaymentMethod } from "@/types/delivery";
import { CustomerSearchSelect } from "@/features/tenant/customers/CustomerSearchSelect";
import { PaymentsNav } from "./PaymentsNav";

const METHODS: PaymentMethod[] = ["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"];

const schema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customerId") ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: presetCustomerId,
      amount: "",
      paymentDate: todayIsoDate(),
      method: "CASH",
      collectedById: "",
      reference: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (presetCustomerId) setValue("customerId", presetCustomerId);
  }, [presetCustomerId, setValue]);

  const customerId = watch("customerId");

  const usersQuery = useQuery({
    queryKey: [USERS_QUERY_KEY, "payment-collectors"],
    queryFn: () => usersApi.list({ limit: 100, status: "ACTIVE" }),
  });

  const balanceQuery = useQuery({
    queryKey: [CUSTOMER_BALANCE_QUERY_KEY, customerId],
    queryFn: () => customersApi.balance(customerId),
    enabled: !!customerId,
  });

  const collectors = usersQuery.data?.data?.items ?? [];
  const balance = balanceQuery.data?.data?.balance;

  const save = useApiMutation(
    (values: FormValues) =>
      paymentsApi.create({
        customerId: values.customerId,
        amount: parseOptionalNumber(values.amount) ?? 0,
        paymentDate: values.paymentDate,
        method: values.method,
        collectedById: values.collectedById || null,
        reference: values.reference?.trim() || null,
        notes: values.notes?.trim() || null,
      }),
    {
      onSuccess: (_res, values) => {
        qc.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [CUSTOMER_BALANCE_QUERY_KEY, values.customerId] });
        qc.invalidateQueries({ queryKey: [CUSTOMER_LEDGER_QUERY_KEY, values.customerId] });
        toast({ title: "Payment recorded", variant: "success" });
        router.push("/payments");
      },
      onError: (err) => {
        toast({
          title: "Could not record payment",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/payments"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Payments
        </Link>
        <PageHeader
          title="Record Payment"
          description="Create a standalone payment and credit the customer ledger"
        />
      </div>

      <PaymentsNav />

      <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField label="Customer" error={errors.customerId?.message} required>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <CustomerSearchSelect value={field.value} onChange={(id) => field.onChange(id)} />
                )}
              />
            </FormField>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Current balance
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {!customerId
                  ? "—"
                  : balanceQuery.isLoading
                    ? "…"
                    : (balance ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
              </p>
            </div>

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
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save Payment"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/payments">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
