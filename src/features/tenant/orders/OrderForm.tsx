"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { CustomerSearchSelect } from "@/features/tenant/customers/CustomerSearchSelect";
import { customersApi } from "@/lib/customers-api";
import { ordersApi } from "@/lib/orders-api";
import { productsApi } from "@/lib/products-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INT_RE, MONEY_RE, QTY_RE, parseOptionalNumber } from "@/lib/form-number";
import { PERMISSIONS } from "@/constants/permissions";
import {
  CUSTOMER_DETAIL_QUERY_KEY,
  ORDERS_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
} from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import type { OrderDetail } from "@/types/orders";
import type { Product } from "@/types/products";
import { baseUnitLabel, needsExplicitPackagingCount } from "@/types/products";

const EMPTY_PRODUCTS: Product[] = [];

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.string().regex(QTY_RE, "Qty must be a non-negative number (max 3 decimals)"),
  unitPrice: z.string().regex(MONEY_RE, "Unit price can have at most 2 decimals"),
  containersDelivered: z.string().optional(),
});

const schema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    discountTotal: z.string().optional(),
    deliveryCharges: z.string().optional(),
    shippingAddress: z.string().max(2000).optional(),
    shippingNotes: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),
    preferredShipDate: z.string().optional(),
    items: z.array(lineSchema).min(1, "Add at least one product line"),
  })
  .superRefine((values, ctx) => {
    const productIds = values.items.map((i) => i.productId).filter(Boolean);
    if (new Set(productIds).size !== productIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate products are not allowed",
        path: ["items"],
      });
    }
    values.items.forEach((item, index) => {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Quantity must be greater than zero",
          path: ["items", index, "quantity"],
        });
      }
      const cansRaw = item.containersDelivered?.trim() ?? "";
      if (cansRaw !== "" && !INT_RE.test(cansRaw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cans must be a whole number",
          path: ["items", index, "containersDelivered"],
        });
      }
    });
    for (const field of ["discountTotal", "deliveryCharges"] as const) {
      const raw = values[field]?.trim() ?? "";
      if (raw === "") continue;
      if (!MONEY_RE.test(raw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Can have at most 2 decimal places",
          path: [field],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface OrderFormProps {
  order?: OrderDetail | null;
}

function moneyPreview(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OrderForm({ order }: OrderFormProps) {
  const isEdit = !!order;
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: containersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS);

  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "active-for-orders"],
    queryFn: () => productsApi.list({ isActive: true }),
  });
  const products = productsQuery.data?.data ?? EMPTY_PRODUCTS;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: order?.customerId ?? "",
      discountTotal: order ? String(order.discountTotal) : "0",
      deliveryCharges: order ? String(order.deliveryCharges) : "0",
      shippingAddress: order?.shippingAddress ?? "",
      shippingNotes: order?.shippingNotes ?? "",
      internalNotes: order?.internalNotes ?? "",
      preferredShipDate: order?.preferredShipDate ?? "",
      items: order?.items.map((i) => ({
        productId: i.productId,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPriceSnapshot),
        containersDelivered: i.containersDelivered > 0 ? String(i.containersDelivered) : "",
      })) ?? [{ productId: "", quantity: "1", unitPrice: "0", containersDelivered: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (!order) return;
    const next = {
      customerId: order.customerId,
      discountTotal: String(order.discountTotal),
      deliveryCharges: String(order.deliveryCharges),
      shippingAddress: order.shippingAddress ?? "",
      shippingNotes: order.shippingNotes ?? "",
      internalNotes: order.internalNotes ?? "",
      preferredShipDate: order.preferredShipDate ?? "",
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPriceSnapshot),
        containersDelivered: i.containersDelivered > 0 ? String(i.containersDelivered) : "",
      })),
    };
    reset(next);
    setLive(next);
  }, [order, reset]);

  // Field-array nested register() edits don't always notify useWatch("items").
  // Subscribe to every change so totals update as soon as qty/price change.
  const [live, setLive] = useState(() => getValues());
  useEffect(() => {
    const sub = watch((value) => {
      setLive({
        customerId: value.customerId ?? "",
        discountTotal: value.discountTotal,
        deliveryCharges: value.deliveryCharges,
        shippingAddress: value.shippingAddress,
        shippingNotes: value.shippingNotes,
        internalNotes: value.internalNotes,
        preferredShipDate: value.preferredShipDate,
        items: (value.items ?? []).map((item) => ({
          productId: item?.productId ?? "",
          quantity: item?.quantity ?? "",
          unitPrice: item?.unitPrice ?? "",
          containersDelivered: item?.containersDelivered ?? "",
        })),
      });
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const customerId = live.customerId;
  const items = live.items;
  const discountTotal = live.discountTotal;
  const deliveryCharges = live.deliveryCharges;

  const customerQuery = useQuery({
    queryKey: [CUSTOMER_DETAIL_QUERY_KEY, customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !!customerId,
  });
  const priceByProduct = useMemo(() => {
    const customerPrices = customerQuery.data?.data?.productPrices ?? [];
    const map = new Map<string, number>();
    for (const p of products) map.set(p.id, p.defaultSellingPrice);
    for (const row of customerPrices) map.set(row.productId, row.pricePerUnit);
    return map;
  }, [products, customerQuery.data?.data?.productPrices]);

  function applyDefaultPrice(index: number, productId: string) {
    const price = priceByProduct.get(productId);
    if (price != null) {
      setValue(`items.${index}.unitPrice`, String(price), {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }

  const preview = useMemo(() => {
    let subtotal = 0;
    for (const line of items ?? []) {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      if (Number.isFinite(qty) && Number.isFinite(price)) subtotal += qty * price;
    }
    const discount = parseOptionalNumber(discountTotal) ?? 0;
    const charges = parseOptionalNumber(deliveryCharges) ?? 0;
    const total = Math.max(0, subtotal - discount + charges);
    return { subtotal, discount, charges, total };
  }, [items, discountTotal, deliveryCharges]);

  function buildPayload(values: FormValues) {
    const items = values.items.map((i) => {
      const product = products.find((p) => p.id === i.productId);
      const needsCans = containersEnabled && !!product && needsExplicitPackagingCount(product);
      const cansRaw = i.containersDelivered?.trim() ?? "";
      if (needsCans) {
        if (!INT_RE.test(cansRaw) || Number(cansRaw) < 1) {
          throw new Error(
            `Enter how many cans for "${product?.name ?? "product"}" (litres sold is not the can count)`
          );
        }
      }
      return {
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        ...(needsCans ? { containersDelivered: Number(cansRaw) } : {}),
      };
    });
    return {
      customerId: values.customerId,
      discountTotal: parseOptionalNumber(values.discountTotal) ?? 0,
      deliveryCharges: parseOptionalNumber(values.deliveryCharges) ?? 0,
      shippingAddress: values.shippingAddress?.trim() || null,
      shippingNotes: values.shippingNotes?.trim() || null,
      internalNotes: values.internalNotes?.trim() || null,
      preferredShipDate: values.preferredShipDate?.trim() || null,
      items,
    };
  }

  async function persistDraft(values: FormValues) {
    const payload = buildPayload(values);
    if (isEdit && order) {
      await ordersApi.update(order.id, {
        discountTotal: payload.discountTotal,
        deliveryCharges: payload.deliveryCharges,
        shippingAddress: payload.shippingAddress,
        shippingNotes: payload.shippingNotes,
        internalNotes: payload.internalNotes,
        preferredShipDate: payload.preferredShipDate,
      });
      const replaced = (await ordersApi.replaceItems(order.id, { items: payload.items })).data;
      if (!replaced) throw new Error("Failed to update order items");
      return replaced;
    }
    const created = (await ordersApi.create(payload)).data;
    if (!created) throw new Error("Failed to create order");
    return created;
  }

  const saveDraft = useApiMutation(async (values: FormValues) => persistDraft(values), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      toast({ title: "Draft saved", variant: "success" });
      router.push("/orders");
    },
    onError: (err) => {
      toast({
        title: "Could not save draft",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  const placeOrder = useApiMutation(
    async (values: FormValues) => {
      const saved = await persistDraft(values);
      const placed = (await ordersApi.place(saved.id)).data;
      if (!placed) throw new Error("Failed to place order");
      return placed;
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
        toast({ title: "Order placed", variant: "success" });
        router.push("/orders");
      },
      onError: (err) => {
        toast({
          title: "Could not place order",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  const busy = saveDraft.isPending || placeOrder.isPending;

  return (
    <form className="space-y-6" onSubmit={handleSubmit((v) => saveDraft.mutate(v))}>
      <div>
        <Link
          href={isEdit && order ? `/orders/${order.id}` : "/orders"}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEdit ? "Back to order" : "Back to orders"}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer & shipping</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Customer"
            required
            error={errors.customerId?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <CustomerSearchSelect
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  error={errors.customerId?.message}
                  disabled={isEdit}
                  initialLabel={
                    order ? `${order.customer.name} (${order.customer.phone})` : undefined
                  }
                />
              )}
            />
          </FormField>
          <FormField label="Preferred ship date" error={errors.preferredShipDate?.message}>
            <Input type="date" {...register("preferredShipDate")} />
          </FormField>
          <FormField
            label="Shipping address"
            error={errors.shippingAddress?.message}
            className="sm:col-span-2"
          >
            <Input {...register("shippingAddress")} placeholder="Delivery address" />
          </FormField>
          <FormField
            label="Shipping notes"
            error={errors.shippingNotes?.message}
            className="sm:col-span-2"
          >
            <Input {...register("shippingNotes")} placeholder="Gate code, call on arrival…" />
          </FormField>
          <FormField
            label="Internal notes"
            error={errors.internalNotes?.message}
            className="sm:col-span-2"
          >
            <Input {...register("internalNotes")} placeholder="Staff-only notes" />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Line items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ productId: "", quantity: "1", unitPrice: "0", containersDelivered: "" })
            }
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.items?.message && (
            <p className="text-destructive text-sm" role="alert">
              {errors.items.message}
            </p>
          )}
          {fields.map((field, index) => {
            const product = products.find((p) => p.id === items?.[index]?.productId);
            const needsCans =
              containersEnabled && !!product && needsExplicitPackagingCount(product);
            return (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-12"
              >
                <FormField
                  label="Product"
                  required
                  error={errors.items?.[index]?.productId?.message}
                  className={needsCans ? "sm:col-span-4" : "sm:col-span-5"}
                >
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          applyDefaultPrice(index, e.target.value);
                        }}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        name={field.name}
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                </FormField>
                <FormField
                  label={product ? `Qty (${baseUnitLabel(product.baseUnit)})` : "Qty"}
                  required
                  error={errors.items?.[index]?.quantity?.message}
                  className="sm:col-span-2"
                >
                  <Controller
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => <Input {...field} />}
                  />
                </FormField>
                {needsCans && (
                  <FormField
                    label="Cans"
                    required
                    error={errors.items?.[index]?.containersDelivered?.message}
                    className="sm:col-span-2"
                  >
                    <Controller
                      control={control}
                      name={`items.${index}.containersDelivered`}
                      render={({ field }) => (
                        <Input
                          inputMode="numeric"
                          placeholder="e.g. 1"
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </FormField>
                )}
                <FormField
                  label="Unit price"
                  required
                  error={errors.items?.[index]?.unitPrice?.message}
                  className="sm:col-span-2"
                >
                  <Controller
                    control={control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => <Input {...field} />}
                  />
                </FormField>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Discount" error={errors.discountTotal?.message}>
            <Controller
              control={control}
              name="discountTotal"
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </FormField>
          <FormField label="Delivery charges" error={errors.deliveryCharges?.message}>
            <Controller
              control={control}
              name="deliveryCharges"
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </FormField>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:col-span-2">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{moneyPreview(preview.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Discount</span>
              <span className="font-medium">−{moneyPreview(preview.discount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Delivery charges</span>
              <span className="font-medium">{moneyPreview(preview.charges)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-semibold text-slate-900">{moneyPreview(preview.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <PermissionGuard
          permission={isEdit ? PERMISSIONS.ORDERS.UPDATE : PERMISSIONS.ORDERS.CREATE}
        >
          <Button type="submit" variant="outline" disabled={busy}>
            {saveDraft.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save draft
          </Button>
        </PermissionGuard>
        <PermissionGuard permission={PERMISSIONS.ORDERS.UPDATE}>
          <Button type="button" disabled={busy} onClick={handleSubmit((v) => placeOrder.mutate(v))}>
            {placeOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Place order
          </Button>
        </PermissionGuard>
      </div>
    </form>
  );
}
