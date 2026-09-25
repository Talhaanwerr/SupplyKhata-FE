"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { cashHandoversApi } from "@/lib/cash-handovers-api";
import { staffApi } from "@/lib/staff-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { MONEY_RE } from "@/lib/form-number";
import {
  CASH_HANDOVERS_QUERY_KEY,
  RIDER_CASH_BALANCE_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
} from "@/constants/query-keys";
import { useAuthStore } from "@/store/auth-store";
import type { CashHandover } from "@/types/cash-handovers";

const schema = z.object({
  riderId: z.string().min(1, "Rider is required"),
  receivedById: z.string().min(1, "Received by is required"),
  amount: z.string().regex(MONEY_RE, "Amount can have at most 2 decimal places"),
  handoverDate: z.string().min(1, "Date is required"),
  reference: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  deliveryRunId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface CashHandoverFormModalProps {
  open: boolean;
  onClose: () => void;
  handover?: CashHandover | null;
}

export function CashHandoverFormModal({ open, onClose, handover }: CashHandoverFormModalProps) {
  const isEdit = !!handover;
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentUser = useAuthStore((s) => s.user);

  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "handover-form"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
    enabled: open,
  });
  const staffQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "handover-receivers"],
    queryFn: () => staffApi.list({ limit: 100 }),
    enabled: open,
  });
  const riders = ridersQuery.data?.data?.items ?? [];
  const staff = staffQuery.data?.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      riderId: "",
      receivedById: "",
      amount: "",
      handoverDate: today(),
      reference: "",
      notes: "",
      deliveryRunId: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (handover) {
      reset({
        riderId: handover.riderId,
        receivedById: handover.receivedById,
        amount: String(handover.amount),
        handoverDate: handover.handoverDate.slice(0, 10),
        reference: handover.reference ?? "",
        notes: handover.notes ?? "",
        deliveryRunId: handover.deliveryRunId ?? "",
      });
    } else {
      reset({
        riderId: "",
        receivedById: currentUser?.id ?? "",
        amount: "",
        handoverDate: today(),
        reference: "",
        notes: "",
        deliveryRunId: "",
      });
    }
  }, [open, handover, reset, currentUser?.id]);

  const save = useApiMutation(
    async (values: FormValues) => {
      const payload = {
        riderId: values.riderId,
        receivedById: values.receivedById,
        amount: Number(values.amount),
        handoverDate: values.handoverDate,
        reference: values.reference?.trim() || null,
        notes: values.notes?.trim() || null,
        deliveryRunId: values.deliveryRunId || null,
      };
      if (isEdit && handover) return cashHandoversApi.update(handover.id, payload);
      return cashHandoversApi.create(payload);
    },
    {
      onSuccess: (_res, values) => {
        qc.invalidateQueries({ queryKey: [CASH_HANDOVERS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [RIDER_CASH_BALANCE_QUERY_KEY] });
        if (values.riderId) {
          qc.invalidateQueries({ queryKey: [RIDER_CASH_BALANCE_QUERY_KEY, values.riderId] });
        }
        toast({
          title: isEdit ? "Handover updated" : "Handover recorded",
          variant: "success",
        });
        onClose();
      },
      onError: (err) => setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Cash Handover" : "Record Cash Handover"}</DialogTitle>
          <DialogDescription>Rider hands cash to office staff.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit((v) => save.mutateAsync(v))} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <FormField label="Rider" error={errors.riderId?.message} required>
            <Select {...register("riderId")}>
              <option value="">Select rider</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {`${r.firstName} ${r.lastName}`.trim() || r.email}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Received by" error={errors.receivedById?.message} required>
            <Select {...register("receivedById")}>
              <option value="">Select receiver</option>
              {staff.map((r) => (
                <option key={r.id} value={r.id}>
                  {`${r.firstName} ${r.lastName}`.trim() || r.email}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Amount" error={errors.amount?.message} required>
            <Input inputMode="decimal" {...register("amount")} />
          </FormField>

          <FormField label="Date" error={errors.handoverDate?.message} required>
            <Input type="date" {...register("handoverDate")} />
          </FormField>

          <FormField label="Reference" error={errors.reference?.message}>
            <Input placeholder="Optional" {...register("reference")} />
          </FormField>

          <FormField label="Delivery run ID" error={errors.deliveryRunId?.message}>
            <Input placeholder="Optional" {...register("deliveryRunId")} />
          </FormField>

          <FormField label="Notes" error={errors.notes?.message}>
            <Input placeholder="Optional" {...register("notes")} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
