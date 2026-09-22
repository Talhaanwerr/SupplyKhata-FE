"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { customersApi } from "@/lib/customers-api";
import { areasApi } from "@/lib/areas-api";
import { productsApi } from "@/lib/products-api";
import { usersApi } from "@/lib/users-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import {
  AREAS_QUERY_KEY,
  CUSTOMERS_QUERY_KEY,
  CUSTOMER_DETAIL_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  USERS_QUERY_KEY,
} from "@/constants/query-keys";
import type { CustomerDetail, PaymentCycle, CustomerStatus } from "@/types/customers";
import { MONEY_RE, refineNonNegativeInteger, refineNonNegativeMoney } from "@/lib/form-number";

const NEW_AREA = "__new__";

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
    phone: z.string().min(5, "Phone is required"),
    secondaryPhone: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    areaChoice: z.string().min(1, "Area is required"),
    newAreaName: z.string().optional(),
    locationNotes: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    paymentCycle: z.enum(["CASH_ON_DELIVERY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "CUSTOM"]),
    billingDueDate: z.string().optional(),
    billingAnchorDate: z.string().optional(),
    openingReceivableBalance: z.string().optional(),
    containerDeposit: z.string().optional(),
    defaultRiderId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.areaChoice === NEW_AREA && !val.newAreaName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a new area name",
        path: ["newAreaName"],
      });
    }

    if (val.paymentCycle === "MONTHLY" || val.paymentCycle === "CUSTOM") {
      const raw = val.billingDueDate?.trim() ?? "";
      if (!raw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Billing due day is required for this cycle",
          path: ["billingDueDate"],
        });
      } else {
        const day = Number(raw);
        if (!Number.isInteger(day) || day < 1 || day > 31) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Billing due day must be between 1 and 31",
            path: ["billingDueDate"],
          });
        }
      }
    }

    if (val.paymentCycle === "WEEKLY" || val.paymentCycle === "FORTNIGHTLY") {
      if (!val.billingAnchorDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Billing anchor date is required for this cycle",
          path: ["billingAnchorDate"],
        });
      }
    }

    refineNonNegativeMoney(
      val.openingReceivableBalance,
      "Opening receivable",
      ctx,
      "openingReceivableBalance"
    );
    refineNonNegativeInteger(val.containerDeposit, "Container deposit", ctx, "containerDeposit");
  });

type FormValues = z.infer<typeof schema>;

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: CustomerDetail | null;
}

const PAYMENT_OPTIONS: { value: PaymentCycle; label: string }[] = [
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "Fortnightly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

function validateProductPrices(
  priceInputs: Record<string, string>
):
  | { ok: true; prices: { productId: string; pricePerUnit: number }[] }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const prices: { productId: string; pricePerUnit: number }[] = [];

  for (const [productId, raw] of Object.entries(priceInputs)) {
    if (!raw.trim()) continue;
    const trimmed = raw.trim();
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      errors[productId] = "Enter a valid amount";
      continue;
    }
    if (n < 0) {
      errors[productId] = "Price cannot be negative";
      continue;
    }
    if (!MONEY_RE.test(trimmed)) {
      errors[productId] = "Enter a valid amount (max 2 decimals)";
      continue;
    }
    prices.push({ productId, pricePerUnit: n });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, prices };
}

export function CustomerFormModal({ open, onClose, customer }: CustomerFormModalProps) {
  const isEdit = !!customer;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});

  const { data: areasRes } = useQuery({
    queryKey: [AREAS_QUERY_KEY, "customer-form"],
    queryFn: () => areasApi.list({ includeInactive: true }),
    enabled: open,
  });

  const { data: productsRes } = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "active-for-customer"],
    queryFn: () => productsApi.list({ isActive: true }),
    enabled: open,
  });

  const { data: usersRes } = useQuery({
    queryKey: [USERS_QUERY_KEY, "riders"],
    queryFn: () => usersApi.list({ limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const areas = areasRes?.data ?? [];
  const products = productsRes?.data ?? [];
  const riders = usersRes?.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      secondaryPhone: "",
      address: "",
      areaChoice: "",
      newAreaName: "",
      locationNotes: "",
      status: "ACTIVE",
      paymentCycle: "CASH_ON_DELIVERY",
      billingDueDate: "",
      billingAnchorDate: "",
      openingReceivableBalance: "0",
      containerDeposit: "0",
      defaultRiderId: "",
    },
  });

  const areaChoice = watch("areaChoice");
  const paymentCycle = watch("paymentCycle");
  const showDueDay = paymentCycle === "MONTHLY" || paymentCycle === "CUSTOM";
  const showAnchor = paymentCycle === "WEEKLY" || paymentCycle === "FORTNIGHTLY";

  useEffect(() => {
    if (!open) return;
    setPriceErrors({});
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone,
        secondaryPhone: customer.secondaryPhone ?? "",
        address: customer.address,
        areaChoice: customer.areaId,
        newAreaName: "",
        locationNotes: customer.locationNotes ?? "",
        status: customer.status,
        paymentCycle: customer.paymentCycle,
        billingDueDate: customer.billingDueDate != null ? String(customer.billingDueDate) : "",
        billingAnchorDate: customer.billingAnchorDate ?? "",
        openingReceivableBalance: String(customer.openingReceivableBalance ?? 0),
        containerDeposit: String(Math.trunc(Number(customer.containerDeposit ?? 0))),
        defaultRiderId: customer.defaultRiderId ?? "",
      });
      const map: Record<string, string> = {};
      for (const row of customer.productPrices) {
        map[row.productId] = String(row.pricePerUnit);
      }
      setPriceInputs(map);
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        secondaryPhone: "",
        address: "",
        areaChoice: "",
        newAreaName: "",
        locationNotes: "",
        status: "ACTIVE",
        paymentCycle: "CASH_ON_DELIVERY",
        billingDueDate: "",
        billingAnchorDate: "",
        openingReceivableBalance: "0",
        containerDeposit: "0",
        defaultRiderId: "",
      });
      setPriceInputs({});
    }
  }, [open, customer, reset]);

  const save = useApiMutation(
    async (
      values: FormValues & { customerProductPrices: { productId: string; pricePerUnit: number }[] }
    ) => {
      const payload = {
        name: values.name.trim(),
        email: values.email?.trim() || null,
        phone: values.phone.trim(),
        secondaryPhone: values.secondaryPhone?.trim() || null,
        address: values.address.trim(),
        locationNotes: values.locationNotes?.trim() || null,
        status: values.status as CustomerStatus,
        paymentCycle: values.paymentCycle as PaymentCycle,
        billingDueDate:
          values.paymentCycle === "MONTHLY" || values.paymentCycle === "CUSTOM"
            ? Number(values.billingDueDate)
            : null,
        billingAnchorDate:
          values.paymentCycle === "WEEKLY" || values.paymentCycle === "FORTNIGHTLY"
            ? values.billingAnchorDate?.trim() || null
            : null,
        openingReceivableBalance: Number(values.openingReceivableBalance || 0),
        containerDeposit: Number(values.containerDeposit || 0),
        defaultRiderId: values.defaultRiderId || null,
        customerProductPrices: values.customerProductPrices,
        ...(values.areaChoice === NEW_AREA
          ? { areaName: values.newAreaName!.trim() }
          : { areaId: values.areaChoice }),
      };

      if (isEdit && customer) {
        return customersApi.update(customer.id, payload);
      }
      return customersApi.create(payload);
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
        if (customer) {
          qc.invalidateQueries({ queryKey: [CUSTOMER_DETAIL_QUERY_KEY, customer.id] });
        }
        toast({
          title: isEdit ? "Customer updated" : "Customer created",
          variant: "success",
        });
        onClose();
      },
      onError: (err) => {
        setError("root", { message: getSafeErrorMessage(err) });
      },
    }
  );

  const onValidSubmit = (values: FormValues) => {
    const priceResult = validateProductPrices(priceInputs);
    if (!priceResult.ok) {
      setPriceErrors(priceResult.errors);
      return;
    }
    setPriceErrors({});
    return save.mutateAsync({
      ...values,
      customerProductPrices: priceResult.prices,
    });
  };

  const areaOptions = useMemo(
    () => areas.filter((a) => a.isActive || a.id === customer?.areaId),
    [areas, customer?.areaId]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            Customer details, area, payment settings, and optional product prices.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onValidSubmit)} className="space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" error={errors.name?.message} required>
              <Input placeholder="Ahmed Store" {...register("name")} />
            </FormField>
            <FormField label="Email (optional)" error={errors.email?.message}>
              <Input type="email" placeholder="optional@email.com" {...register("email")} />
            </FormField>
            <FormField label="Phone" error={errors.phone?.message} required>
              <Input placeholder="+92 300 1234567" {...register("phone")} />
            </FormField>
            <FormField label="Secondary phone" error={errors.secondaryPhone?.message}>
              <Input placeholder="Optional" {...register("secondaryPhone")} />
            </FormField>
          </div>

          <FormField label="Address" error={errors.address?.message} required>
            <Input placeholder="Shop address" {...register("address")} />
          </FormField>

          <FormField label="Location notes" error={errors.locationNotes?.message}>
            <Input placeholder="Optional landmark / notes" {...register("locationNotes")} />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Area" error={errors.areaChoice?.message} required>
              <Select {...register("areaChoice")}>
                <option value="">Select area</option>
                {areaOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {!a.isActive ? " (inactive)" : ""}
                  </option>
                ))}
                <option value={NEW_AREA}>+ Add new area…</option>
              </Select>
            </FormField>
            {areaChoice === NEW_AREA && (
              <FormField label="New area name" error={errors.newAreaName?.message} required>
                <Input placeholder="e.g. Gulshan" {...register("newAreaName")} />
              </FormField>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Status" error={errors.status?.message}>
              <Select {...register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>
            <FormField label="Payment cycle" error={errors.paymentCycle?.message}>
              <Select {...register("paymentCycle")}>
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {showDueDay && (
              <FormField
                label="Billing due day"
                error={errors.billingDueDate?.message}
                required
                description="Day of month (1–31) when payment is due"
              >
                <Input type="number" placeholder="1–31" {...register("billingDueDate")} />
              </FormField>
            )}
            {showAnchor && (
              <FormField
                label="Billing anchor date"
                error={errors.billingAnchorDate?.message}
                required
                description="Weekly = every 7 days from this date / Fortnightly = every 14 days"
              >
                <Input type="date" {...register("billingAnchorDate")} />
              </FormField>
            )}
            <FormField label="Default rider" error={errors.defaultRiderId?.message}>
              <Select {...register("defaultRiderId")}>
                <option value="">None</option>
                {riders.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Opening receivable" error={errors.openingReceivableBalance?.message}>
              <Input type="number" step="any" {...register("openingReceivableBalance")} />
            </FormField>
            <FormField label="Container deposit" error={errors.containerDeposit?.message}>
              <Input type="number" step="1" {...register("containerDeposit")} />
            </FormField>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-1 text-sm font-semibold text-slate-900">Product prices</h4>
            <p className="mb-3 text-xs text-slate-500">
              Leave blank to use the product default selling price.
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500">No active products yet.</p>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="grid grid-cols-[1fr_140px] items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">Default: {p.defaultSellingPrice}</p>
                      </div>
                      <Input
                        type="number"
                        step="any"
                        placeholder={`Default: ${p.defaultSellingPrice}`}
                        aria-invalid={!!priceErrors[p.id]}
                        value={priceInputs[p.id] ?? ""}
                        onChange={(e) => {
                          setPriceInputs((prev) => ({ ...prev, [p.id]: e.target.value }));
                          if (priceErrors[p.id]) {
                            setPriceErrors((prev) => {
                              const next = { ...prev };
                              delete next[p.id];
                              return next;
                            });
                          }
                        }}
                      />
                    </div>
                    {priceErrors[p.id] && (
                      <p className="text-xs text-red-600 sm:text-right">{priceErrors[p.id]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
