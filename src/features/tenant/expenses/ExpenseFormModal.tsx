"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { expensesApi } from "@/lib/expenses-api";
import { staffApi } from "@/lib/staff-api";
import { vehiclesApi } from "@/lib/vehicles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { MONEY_RE } from "@/lib/form-number";
import {
  EXPENSES_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
  VEHICLES_QUERY_KEY,
} from "@/constants/query-keys";
import type { Expense } from "@/types/expenses";
import type { PaymentMethod } from "@/types/delivery";

const METHODS: PaymentMethod[] = ["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"];

const schema = z
  .object({
    title: z.string().min(1, "Title is required").max(120),
    description: z.string().max(2000).optional(),
    date: z.string().min(1, "Date is required"),
    amount: z.string().regex(MONEY_RE, "Amount can have at most 2 decimal places"),
    vehicleId: z.string().optional(),
    deliveryRunId: z.string().optional(),
    staffId: z.string().optional(),
    paymentMethod: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"]),
    reference: z.string().max(120).optional(),
    isPaidByRider: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.isPaidByRider && !values.staffId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["staffId"],
        message: "Select the rider who paid",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

export function ExpenseFormModal({ open, onClose, expense }: ExpenseFormModalProps) {
  const isEdit = !!expense;
  const qc = useQueryClient();
  const { toast } = useToast();

  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "expense-form"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
    enabled: open,
  });
  const vehiclesQuery = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, "expense-form"],
    queryFn: () => vehiclesApi.list({ status: "ACTIVE", limit: 100 }),
    enabled: open,
  });
  const riders = ridersQuery.data?.data?.items ?? [];
  const vehicles = vehiclesQuery.data?.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      date: today(),
      amount: "",
      vehicleId: "",
      deliveryRunId: "",
      staffId: "",
      paymentMethod: "CASH",
      reference: "",
      isPaidByRider: false,
    },
  });

  const isPaidByRider = useWatch({ control, name: "isPaidByRider" });

  useEffect(() => {
    if (!open) return;
    if (expense) {
      reset({
        title: expense.title,
        description: expense.description ?? "",
        date: expense.date.slice(0, 10),
        amount: String(expense.amount),
        vehicleId: expense.vehicleId ?? "",
        deliveryRunId: expense.deliveryRunId ?? "",
        staffId: expense.staffId ?? "",
        paymentMethod: expense.paymentMethod,
        reference: expense.reference ?? "",
        isPaidByRider: expense.isPaidByRider,
      });
    } else {
      reset({
        title: "",
        description: "",
        date: today(),
        amount: "",
        vehicleId: "",
        deliveryRunId: "",
        staffId: "",
        paymentMethod: "CASH",
        reference: "",
        isPaidByRider: false,
      });
    }
  }, [open, expense, reset]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        date: values.date,
        amount: Number(values.amount),
        vehicleId: values.vehicleId || null,
        deliveryRunId: values.deliveryRunId || null,
        staffId: values.staffId || null,
        paymentMethod: values.paymentMethod,
        reference: values.reference?.trim() || null,
        isPaidByRider: values.isPaidByRider,
      };
      if (isEdit && expense) return expensesApi.update(expense.id, payload);
      return expensesApi.create(payload);
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [EXPENSES_QUERY_KEY] });
        toast({ title: isEdit ? "Expense updated" : "Expense created", variant: "success" });
        onClose();
      },
      onError: (err) => setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            Use a free-text title (e.g. Petrol, Loader rent). No fixed categories.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Title" error={errors.title?.message} required>
            <Input placeholder="e.g. Petrol" {...register("title")} />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <Input placeholder="Where / why (optional)" {...register("description")} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" error={errors.date?.message} required>
              <Input type="date" {...register("date")} />
            </FormField>
            <FormField label="Amount" error={errors.amount?.message} required>
              <Input inputMode="decimal" {...register("amount")} />
            </FormField>
          </div>

          <FormField label="Payment method" error={errors.paymentMethod?.message} required>
            <Select {...register("paymentMethod")}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Vehicle" error={errors.vehicleId?.message}>
            <Select {...register("vehicleId")}>
              <option value="">None</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Delivery run ID" error={errors.deliveryRunId?.message}>
            <Input placeholder="Optional run id" {...register("deliveryRunId")} />
          </FormField>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPaidByRider}
              onChange={(e) =>
                setValue("isPaidByRider", e.target.checked, { shouldValidate: true })
              }
            />
            Paid by rider
          </label>

          <FormField
            label={isPaidByRider ? "Rider who paid" : "Staff / Rider"}
            error={errors.staffId?.message}
            required={isPaidByRider}
          >
            <Select {...register("staffId")}>
              <option value="">None</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {`${r.firstName} ${r.lastName}`.trim() || r.email}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Reference" error={errors.reference?.message}>
            <Input placeholder="Optional" {...register("reference")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
