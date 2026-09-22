"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Pencil, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { customersApi } from "@/lib/customers-api";
import { deliveriesApi } from "@/lib/deliveries-api";
import { deliveryRunsApi } from "@/lib/delivery-runs-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INT_RE, MONEY_RE } from "@/lib/form-number";
import { PERMISSIONS } from "@/constants/permissions";
import {
  CUSTOMERS_QUERY_KEY,
  CUSTOMER_BALANCE_QUERY_KEY,
  CUSTOMER_DETAIL_QUERY_KEY,
  DELIVERIES_QUERY_KEY,
  DELIVERY_RUN_DETAIL_QUERY_KEY,
  DELIVERY_RUNS_QUERY_KEY,
  DELIVERY_RUN_SUMMARY_QUERY_KEY,
  PAYMENTS_DASHBOARD_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
} from "@/constants/query-keys";
import { productsApi } from "@/lib/products-api";
import type { DeliveryDetail, DeliveryRunStockPayload, PaymentMethod } from "@/types/delivery";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantityDelivered: z.string().regex(INT_RE, "Qty must be a whole number"),
  emptiesReceived: z.string().regex(INT_RE, "Empties must be a whole number"),
});

const deliverySchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    deliveryDate: z.string().min(1, "Date is required"),
    paymentMethod: z.enum(["CASH", "BANK", "EASYPAISA", "JAZZCASH", "OTHER"]),
    cashReceived: z
      .string()
      .min(1, "Cash received is required")
      .regex(MONEY_RE, "Cash received can have at most 2 decimal places"),
    notes: z.string().max(500).optional(),
    promisedPayDate: z.string().optional(),
    promisedAmount: z.string().optional(),
    items: z.array(itemSchema).min(1),
  })
  .superRefine((values, ctx) => {
    const hasActivity = values.items.some(
      (item) =>
        (INT_RE.test(item.quantityDelivered) && Number(item.quantityDelivered) > 0) ||
        (INT_RE.test(item.emptiesReceived) && Number(item.emptiesReceived) > 0)
    );
    if (!hasActivity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter delivered qty or empties for at least one product",
        path: ["root"],
      });
    }
    const amountRaw = values.promisedAmount?.trim() ?? "";
    const hasAmount = amountRaw.length > 0 && amountRaw !== "0";
    if (hasAmount) {
      if (!MONEY_RE.test(amountRaw) || Number(amountRaw) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Promised amount must be a positive amount with at most 2 decimals",
          path: ["promisedAmount"],
        });
      }
      if (!values.promisedPayDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Promised pay date is required when amount is set",
          path: ["promisedPayDate"],
        });
      }
    }
    if (
      values.promisedPayDate?.trim() &&
      values.deliveryDate?.trim() &&
      values.promisedPayDate < values.deliveryDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promised pay date cannot be before delivery date",
        path: ["promisedPayDate"],
      });
    }
  });

const closeSchema = z.object({
  closingCash: z
    .string()
    .min(1, "Closing cash is required")
    .regex(MONEY_RE, "Closing cash can have at most 2 decimal places"),
  closingStock: z.array(
    itemSchema.pick({ productId: true }).extend({
      filledCount: z.string().regex(INT_RE, "Filled cans must be a whole number"),
      emptyCount: z.string().regex(INT_RE, "Empty cans must be a whole number"),
    })
  ),
});

const editOpeningSchema = z.object({
  openingCash: z
    .string()
    .min(1, "Opening cash is required")
    .regex(MONEY_RE, "Opening cash can have at most 2 decimal places"),
  notes: z.string().max(500).optional(),
  openingStock: z.array(
    itemSchema.pick({ productId: true }).extend({
      filledCount: z.string().regex(INT_RE, "Filled cans must be a whole number"),
      emptyCount: z.string().regex(INT_RE, "Empty cans must be a whole number"),
    })
  ),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;
type CloseFormValues = z.infer<typeof closeSchema>;
type EditOpeningFormValues = z.infer<typeof editOpeningSchema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function DeliveryRunDetailView() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelDelivery, setCancelDelivery] = useState<DeliveryDetail | null>(null);
  const [viewDelivery, setViewDelivery] = useState<DeliveryDetail | null>(null);

  const runQuery = useQuery({
    queryKey: [DELIVERY_RUN_DETAIL_QUERY_KEY, runId],
    queryFn: () => deliveryRunsApi.get(runId),
    enabled: !!runId,
  });
  const summaryQuery = useQuery({
    queryKey: [DELIVERY_RUN_SUMMARY_QUERY_KEY, runId],
    queryFn: () => deliveryRunsApi.summary(runId),
    enabled: !!runId,
  });
  const customersQuery = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, "delivery-form"],
    queryFn: () => customersApi.list({ status: "ACTIVE", limit: 100 }),
  });
  const productsQuery = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, "delivery-form"],
    queryFn: () => productsApi.list({ isActive: true }),
  });

  const run = runQuery.data?.data;
  const summary = summaryQuery.data?.data;
  const customers = customersQuery.data?.data?.items ?? [];
  const products = productsQuery.data?.data ?? [];
  const isClosed = run?.status === "CLOSED";

  const deliveryForm = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      customerId: "",
      deliveryDate: today(),
      paymentMethod: "CASH",
      cashReceived: "0",
      notes: "",
      promisedPayDate: "",
      promisedAmount: "",
      items: [],
    },
  });
  const closeForm = useForm<CloseFormValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: { closingCash: "0", closingStock: [] },
  });
  const editForm = useForm<EditOpeningFormValues>({
    resolver: zodResolver(editOpeningSchema),
    defaultValues: { openingCash: "0", notes: "", openingStock: [] },
  });

  const selectedCustomerId = deliveryForm.watch("customerId");
  const watchedItems = deliveryForm.watch("items");
  const watchedClosingStock = closeForm.watch("closingStock");
  const customerDetailQuery = useQuery({
    queryKey: [CUSTOMER_DETAIL_QUERY_KEY, selectedCustomerId],
    queryFn: () => customersApi.get(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });

  const remainingFilledByProduct = useMemo(() => {
    const map = new Map<string, number>();
    if (!run) return map;
    for (const stock of run.stocks) {
      if (stock.stockType !== "OPENING") continue;
      map.set(stock.productId, stock.filledCount);
    }
    for (const delivery of run.deliveries) {
      if (delivery.status === "CANCELLED") continue;
      for (const item of delivery.items ?? []) {
        map.set(item.productId, (map.get(item.productId) ?? 0) - item.quantityDelivered);
      }
    }
    return map;
  }, [run]);

  const deliveredFilledByProduct = useMemo(() => {
    const map = new Map<string, number>();
    if (!run) return map;
    for (const delivery of run.deliveries) {
      if (delivery.status === "CANCELLED") continue;
      for (const item of delivery.items ?? []) {
        map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantityDelivered);
      }
    }
    return map;
  }, [run]);

  useEffect(() => {
    deliveryForm.reset((current) => ({
      ...current,
      items: products.map((product) => ({
        productId: product.id,
        quantityDelivered: "0",
        emptiesReceived: "0",
      })),
    }));
    closeForm.reset((current) => ({
      ...current,
      closingStock: products.map((product) => ({
        productId: product.id,
        filledCount: "0",
        emptyCount: "0",
      })),
    }));
  }, [products, deliveryForm, closeForm]);

  function openEditOpening() {
    if (!run) return;
    const opening = run.stocks.filter((stock) => stock.stockType === "OPENING");
    const byProduct = new Map(opening.map((stock) => [stock.productId, stock]));
    editForm.reset({
      openingCash: String(run.openingCash ?? 0),
      notes: run.notes ?? "",
      openingStock: products.map((product) => {
        const stock = byProduct.get(product.id);
        return {
          productId: product.id,
          filledCount: String(stock?.filledCount ?? 0),
          emptyCount: String(stock?.emptyCount ?? 0),
        };
      }),
    });
    setEditOpen(true);
  }
  const priceByProduct = useMemo(() => {
    const map = new Map<string, number>();
    const customer = customerDetailQuery.data?.data;
    for (const product of products) {
      const override = customer?.productPrices.find((p) => p.productId === product.id);
      map.set(product.id, override?.pricePerUnit ?? product.defaultSellingPrice);
    }
    return map;
  }, [customerDetailQuery.data?.data, products]);

  const totalSale = useMemo(
    () =>
      watchedItems.reduce((sum, item) => {
        const qty = INT_RE.test(item.quantityDelivered) ? Number(item.quantityDelivered) : 0;
        return sum + qty * (priceByProduct.get(item.productId) ?? 0);
      }, 0),
    [watchedItems, priceByProduct]
  );

  const invalidateRun = () => {
    qc.invalidateQueries({ queryKey: [DELIVERY_RUNS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [DELIVERY_RUN_DETAIL_QUERY_KEY, runId] });
    qc.invalidateQueries({ queryKey: [DELIVERY_RUN_SUMMARY_QUERY_KEY, runId] });
    qc.invalidateQueries({ queryKey: [DELIVERIES_QUERY_KEY] });
  };

  const createDelivery = useApiMutation(
    (values: DeliveryFormValues) => {
      const promisedPayDate = values.promisedPayDate?.trim() || null;
      const promisedAmountRaw = values.promisedAmount?.trim() ?? "";
      const promisedAmount =
        promisedPayDate && promisedAmountRaw && Number(promisedAmountRaw) > 0
          ? Number(promisedAmountRaw)
          : null;
      return deliveriesApi.create({
        deliveryRunId: runId,
        customerId: values.customerId,
        deliveryDate: values.deliveryDate,
        paymentMethod: values.paymentMethod as PaymentMethod,
        cashReceived: Number(values.cashReceived),
        notes: values.notes?.trim() || null,
        promisedPayDate,
        promisedAmount,
        items: values.items
          .filter((item) => Number(item.quantityDelivered) > 0 || Number(item.emptiesReceived) > 0)
          .map((item) => ({
            productId: item.productId,
            quantityDelivered: Number(item.quantityDelivered),
            emptiesReceived: Number(item.emptiesReceived),
          })),
      });
    },
    {
      onSuccess: () => {
        invalidateRun();
        qc.invalidateQueries({ queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [CUSTOMER_BALANCE_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [CUSTOMER_DETAIL_QUERY_KEY] });
        deliveryForm.reset({
          customerId: "",
          deliveryDate: today(),
          paymentMethod: "CASH",
          cashReceived: "0",
          notes: "",
          promisedPayDate: "",
          promisedAmount: "",
          items: products.map((product) => ({
            productId: product.id,
            quantityDelivered: "0",
            emptiesReceived: "0",
          })),
        });
        setDeliveryOpen(false);
        toast({ title: "Delivery saved", variant: "success" });
      },
      onError: (err) => deliveryForm.setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  const closeRun = useApiMutation(
    (values: CloseFormValues) =>
      deliveryRunsApi.close(runId, {
        closingCash: Number(values.closingCash),
        closingStock: values.closingStock.map((stock): DeliveryRunStockPayload => ({
          productId: stock.productId,
          filledCount: Number(stock.filledCount),
          emptyCount: Number(stock.emptyCount),
        })),
      }),
    {
      onSuccess: () => {
        invalidateRun();
        setCloseOpen(false);
        toast({ title: "Delivery run closed", variant: "success" });
      },
      onError: (err) => closeForm.setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  const updateOpening = useApiMutation(
    (values: EditOpeningFormValues) =>
      deliveryRunsApi.update(runId, {
        openingCash: Number(values.openingCash),
        notes: values.notes?.trim() || null,
        openingStock: values.openingStock.map((stock): DeliveryRunStockPayload => ({
          productId: stock.productId,
          filledCount: Number(stock.filledCount),
          emptyCount: Number(stock.emptyCount),
        })),
      }),
    {
      onSuccess: () => {
        invalidateRun();
        setEditOpen(false);
        toast({ title: "Opening details updated", variant: "success" });
      },
      onError: (err) => editForm.setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  function submitDelivery(values: DeliveryFormValues) {
    for (const item of values.items) {
      const qty = Number(item.quantityDelivered);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const available = remainingFilledByProduct.get(item.productId) ?? 0;
      if (qty > available) {
        const product = products.find((row) => row.id === item.productId);
        deliveryForm.setError("root", {
          message: `Only ${available} filled left on this run for "${product?.name ?? "product"}"`,
        });
        return Promise.resolve();
      }
    }
    return createDelivery.mutateAsync(values);
  }

  function submitEditOpening(values: EditOpeningFormValues) {
    for (const stock of values.openingStock) {
      const filled = Number(stock.filledCount);
      const delivered = deliveredFilledByProduct.get(stock.productId) ?? 0;
      if (filled < delivered) {
        const product = products.find((row) => row.id === stock.productId);
        editForm.setError("root", {
          message: `Opening filled for "${product?.name ?? "product"}" cannot be below already delivered (${delivered})`,
        });
        return Promise.resolve();
      }
    }
    return updateOpening.mutateAsync(values);
  }

  const cancelDeliveryMutation = useApiMutation((id: string) => deliveriesApi.cancel(id), {
    onSuccess: () => {
      invalidateRun();
      qc.invalidateQueries({ queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMER_DETAIL_QUERY_KEY] });
      setCancelDelivery(null);
      toast({ title: "Delivery cancelled", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not cancel delivery",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setCancelDelivery(null);
    },
  });

  const closePreview = useMemo(() => {
    const expected = new Map(
      summary?.productDiscrepancies.map((row) => [row.productId, row]) ?? []
    );
    return watchedClosingStock.map((stock) => {
      const product = products.find((p) => p.id === stock.productId);
      const row = expected.get(stock.productId);
      const filled = INT_RE.test(stock.filledCount) ? Number(stock.filledCount) : 0;
      const empty = INT_RE.test(stock.emptyCount) ? Number(stock.emptyCount) : 0;
      return {
        productId: stock.productId,
        productName: product?.name ?? "Product",
        missingContainers: row
          ? row.expectedClosingFilled + row.expectedClosingEmpty - filled - empty
          : 0,
      };
    });
  }, [products, summary?.productDiscrepancies, watchedClosingStock]);

  const deliveryColumns: Column<DeliveryDetail>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (row) => <span className="font-medium text-slate-900">{row.customer.name}</span>,
    },
    {
      key: "products",
      header: "Products",
      render: (row) => {
        const lines = (row.items ?? []).filter(
          (item) => item.quantityDelivered > 0 || item.emptiesReceived > 0
        );
        if (lines.length === 0) {
          return <span className="text-slate-400">{row.productsSummary || "-"}</span>;
        }
        return (
          <div className="space-y-1">
            {lines.map((item) => (
              <p key={item.id} className="text-sm text-slate-800">
                {item.product.name}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      key: "delivered",
      header: "Delivered",
      render: (row) => {
        const lines = (row.items ?? []).filter(
          (item) => item.quantityDelivered > 0 || item.emptiesReceived > 0
        );
        if (lines.length === 0) return <span>-</span>;
        return (
          <div className="space-y-1">
            {lines.map((item) => (
              <p key={item.id} className="text-sm text-slate-800 tabular-nums">
                {item.quantityDelivered}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      key: "empties",
      header: "Empties",
      render: (row) => {
        const lines = (row.items ?? []).filter(
          (item) => item.quantityDelivered > 0 || item.emptiesReceived > 0
        );
        if (lines.length === 0) return <span>-</span>;
        return (
          <div className="space-y-1">
            {lines.map((item) => (
              <p key={item.id} className="text-sm text-slate-800 tabular-nums">
                {item.emptiesReceived}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      key: "sale",
      header: "Sale",
      render: (row) => {
        const sale =
          row.totalSale ?? (row.items ?? []).reduce((sum, item) => sum + (item.lineTotal ?? 0), 0);
        return <span className="tabular-nums">{money(sale)}</span>;
      },
    },
    {
      key: "cash",
      header: "Cash",
      render: (row) => <span className="tabular-nums">{money(row.cashReceived)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewDelivery(row)}
            aria-label="View delivery"
          >
            <Eye className="h-4 w-4 text-slate-600" />
          </Button>
          {isClosed || row.status === "CANCELLED" ? null : (
            <PermissionGuard permission={PERMISSIONS.DELIVERIES.UPDATE}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelDelivery(row)}
                aria-label="Cancel delivery"
              >
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ];

  if (runQuery.isLoading) return <p className="text-sm text-slate-500">Loading run...</p>;
  if (!run)
    return <EmptyState title="Delivery run not found" description="It may have been removed." />;

  const openingStock = run.stocks.filter((stock) => stock.stockType === "OPENING");
  const closingStock = run.stocks.filter((stock) => stock.stockType === "CLOSING");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/delivery-runs">
          <ArrowLeft className="h-4 w-4" />
          Back to runs
        </Link>
      </Button>

      <PageHeader
        title={`Run: ${new Date(run.date).toLocaleDateString()}`}
        description={`${run.rider.firstName} ${run.rider.lastName} - ${run.vehicle.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={run.status} />
            {!isClosed && (
              <>
                <PermissionGuard permission={PERMISSIONS.DELIVERY_RUNS.UPDATE}>
                  <Button variant="outline" onClick={openEditOpening}>
                    <Pencil className="h-4 w-4" />
                    Edit Opening
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.DELIVERIES.CREATE}>
                  <Button onClick={() => setDeliveryOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Delivery
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.DELIVERY_RUNS.UPDATE}>
                  <Button variant="outline" onClick={() => setCloseOpen(true)}>
                    Close Run
                  </Button>
                </PermissionGuard>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Opening cash</p>
            <p className="text-xl font-semibold">{money(run.openingCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Sales</p>
            <p className="text-xl font-semibold">{money(summary?.totalSales ?? run.totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Cash collected</p>
            <p className="text-xl font-semibold">
              {money(summary?.totalCashCollected ?? run.totalCashCollected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Closing cash</p>
            <p className="text-xl font-semibold">{money(run.closingCash)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StockCard title="Opening Stock" rows={openingStock} />
        <StockCard title="Closing Stock" rows={closingStock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={deliveryColumns}
            data={run.deliveries}
            emptyState={<EmptyState title="No deliveries yet" description="Add the first stop." />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary?.productDiscrepancies.map((row) => (
            <div key={row.productId} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">{row.productName}</p>
              <p className="text-slate-600">
                Expected closing: {row.expectedClosingFilled} filled, {row.expectedClosingEmpty}{" "}
                empty. Actual: {row.closingFilled} filled, {row.closingEmpty} empty.
              </p>
              <p className={row.missingContainers === 0 ? "text-green-700" : "text-red-700"}>
                Missing containers: {row.missingContainers}
              </p>
            </div>
          ))}
          {summary && (
            <p className="text-sm text-slate-600">
              Cash difference:{" "}
              {summary.cashDifference == null ? "-" : money(summary.cashDifference)}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={deliveryOpen} onOpenChange={(v) => !v && setDeliveryOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Delivery</DialogTitle>
            <DialogDescription>
              Record one customer stop with all products in one save.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={deliveryForm.handleSubmit((v) => submitDelivery(v))}
            className="space-y-4"
          >
            {deliveryForm.formState.errors.root && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {deliveryForm.formState.errors.root.message}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Customer"
                error={deliveryForm.formState.errors.customerId?.message}
                required
              >
                <Select {...deliveryForm.register("customerId")}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Date"
                error={deliveryForm.formState.errors.deliveryDate?.message}
                required
              >
                <Input type="date" {...deliveryForm.register("deliveryDate")} />
              </FormField>
              <FormField
                label="Payment method"
                error={deliveryForm.formState.errors.paymentMethod?.message}
              >
                <Select {...deliveryForm.register("paymentMethod")}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="EASYPAISA">Easypaisa</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
              <FormField
                label="Cash received"
                error={deliveryForm.formState.errors.cashReceived?.message}
              >
                <Input inputMode="decimal" {...deliveryForm.register("cashReceived")} />
              </FormField>
            </div>
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Payment promise (optional)</p>
                <p className="text-xs text-slate-500">
                  If customer says they will pay later, set the date. This becomes their due date.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Promised pay date"
                  error={deliveryForm.formState.errors.promisedPayDate?.message}
                >
                  <Input
                    type="date"
                    className="h-11 text-base"
                    {...deliveryForm.register("promisedPayDate")}
                  />
                </FormField>
                <FormField
                  label="Promised amount"
                  error={deliveryForm.formState.errors.promisedAmount?.message}
                >
                  <Input
                    className="h-11 text-base"
                    inputMode="decimal"
                    placeholder="Optional"
                    {...deliveryForm.register("promisedAmount")}
                  />
                </FormField>
              </div>
            </div>
            <div className="space-y-3">
              {products.map((product, index) => {
                const available = remainingFilledByProduct.get(product.id) ?? 0;
                return (
                  <div key={product.id} className="rounded-xl border border-slate-200 p-3">
                    <input type="hidden" {...deliveryForm.register(`items.${index}.productId`)} />
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p
                          className={`text-xs ${available > 0 ? "text-slate-500" : "text-red-600"}`}
                        >
                          Available filled on run: {available}
                        </p>
                      </div>
                      <span className="text-sm text-slate-500">
                        Price: {money(priceByProduct.get(product.id))}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        label="Qty delivered"
                        error={
                          deliveryForm.formState.errors.items?.[index]?.quantityDelivered?.message
                        }
                      >
                        <Input
                          className="h-11 text-base"
                          inputMode="numeric"
                          {...deliveryForm.register(`items.${index}.quantityDelivered`)}
                        />
                      </FormField>
                      <FormField
                        label="Empties received"
                        error={
                          deliveryForm.formState.errors.items?.[index]?.emptiesReceived?.message
                        }
                      >
                        <Input
                          className="h-11 text-base"
                          inputMode="numeric"
                          {...deliveryForm.register(`items.${index}.emptiesReceived`)}
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>
            <FormField label="Notes" error={deliveryForm.formState.errors.notes?.message}>
              <Input placeholder="Optional" {...deliveryForm.register("notes")} />
            </FormField>
            <div className="rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-900">
              Total sale: {money(totalSale)}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeliveryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDelivery.isPending}>
                {createDelivery.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Delivery
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(v) => !v && setEditOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Opening</DialogTitle>
            <DialogDescription>
              Fix opening cash or stock while the run is open. Opening filled cannot go below
              already delivered quantities.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={editForm.handleSubmit((v) => submitEditOpening(v))}
            className="space-y-4"
          >
            {editForm.formState.errors.root && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {editForm.formState.errors.root.message}
              </p>
            )}
            <FormField
              label="Opening cash"
              error={editForm.formState.errors.openingCash?.message}
              required
            >
              <Input inputMode="decimal" {...editForm.register("openingCash")} />
            </FormField>
            <FormField label="Notes" error={editForm.formState.errors.notes?.message}>
              <Input placeholder="Optional" {...editForm.register("notes")} />
            </FormField>
            {products.map((product, index) => {
              const delivered = deliveredFilledByProduct.get(product.id) ?? 0;
              return (
                <div key={product.id} className="rounded-xl border border-slate-200 p-3">
                  <input type="hidden" {...editForm.register(`openingStock.${index}.productId`)} />
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">Already delivered: {delivered}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      label="Opening filled"
                      error={editForm.formState.errors.openingStock?.[index]?.filledCount?.message}
                    >
                      <Input
                        inputMode="numeric"
                        {...editForm.register(`openingStock.${index}.filledCount`)}
                      />
                    </FormField>
                    <FormField
                      label="Opening empty"
                      error={editForm.formState.errors.openingStock?.[index]?.emptyCount?.message}
                    >
                      <Input
                        inputMode="numeric"
                        {...editForm.register(`openingStock.${index}.emptyCount`)}
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateOpening.isPending}>
                {updateOpening.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Opening
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={(v) => !v && setCloseOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Close Delivery Run</DialogTitle>
            <DialogDescription>
              Check opening cash and collected cash, then enter what the rider has now as closing
              cash.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={closeForm.handleSubmit((v) => closeRun.mutateAsync(v))}
            className="space-y-4"
          >
            {closeForm.formState.errors.root && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {closeForm.formState.errors.root.message}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Opening cash</p>
                <p className="text-sm font-semibold text-slate-900">{money(run.openingCash)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Cash collected</p>
                <p className="text-sm font-semibold text-slate-900">
                  {money(summary?.totalCashCollected ?? run.totalCashCollected)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Expected in hand</p>
                <p className="text-sm font-semibold text-slate-900">
                  {money(
                    summary?.expectedCash ??
                      run.openingCash + (summary?.totalCashCollected ?? run.totalCashCollected)
                  )}
                </p>
              </div>
            </div>
            <FormField
              label="Closing cash"
              error={closeForm.formState.errors.closingCash?.message}
              required
            >
              <Input
                inputMode="decimal"
                placeholder="What the rider has now"
                {...closeForm.register("closingCash")}
              />
            </FormField>
            {products.map((product, index) => (
              <div key={product.id} className="rounded-xl border border-slate-200 p-3">
                <input type="hidden" {...closeForm.register(`closingStock.${index}.productId`)} />
                <p className="mb-3 font-medium text-slate-900">{product.name}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Closing filled"
                    error={closeForm.formState.errors.closingStock?.[index]?.filledCount?.message}
                  >
                    <Input
                      inputMode="numeric"
                      {...closeForm.register(`closingStock.${index}.filledCount`)}
                    />
                  </FormField>
                  <FormField
                    label="Closing empty"
                    error={closeForm.formState.errors.closingStock?.[index]?.emptyCount?.message}
                  >
                    <Input
                      inputMode="numeric"
                      {...closeForm.register(`closingStock.${index}.emptyCount`)}
                    />
                  </FormField>
                </div>
              </div>
            ))}
            {closePreview.length > 0 && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-sm font-medium text-slate-900">Discrepancy preview</p>
                <div className="space-y-1 text-sm">
                  {closePreview.map((row) => (
                    <p
                      key={row.productId}
                      className={row.missingContainers === 0 ? "text-green-700" : "text-red-700"}
                    >
                      {row.productName}: missing containers {row.missingContainers}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={closeRun.isPending}>
                {closeRun.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Close Run
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewDelivery} onOpenChange={(v) => !v && setViewDelivery(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Detail</DialogTitle>
            <DialogDescription>
              {viewDelivery
                ? `${viewDelivery.customer.name} — ${new Date(viewDelivery.deliveryDate).toLocaleDateString()}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewDelivery && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Customer" value={viewDelivery.customer.name} />
                <DetailRow label="Phone" value={viewDelivery.customer.phone || "-"} />
                <DetailRow
                  label="Date"
                  value={new Date(viewDelivery.deliveryDate).toLocaleDateString()}
                />
                <DetailRow label="Status" value={viewDelivery.status} />
                <DetailRow label="Payment method" value={viewDelivery.paymentMethod} />
                <DetailRow label="Cash received" value={money(viewDelivery.cashReceived)} />
                <DetailRow
                  label="Promised pay date"
                  value={
                    viewDelivery.promisedPayDate
                      ? new Date(viewDelivery.promisedPayDate).toLocaleDateString()
                      : "-"
                  }
                />
                <DetailRow
                  label="Promised amount"
                  value={
                    viewDelivery.promisedAmount == null ? "-" : money(viewDelivery.promisedAmount)
                  }
                />
                <DetailRow
                  label="Total sale"
                  value={money(
                    viewDelivery.totalSale ??
                      viewDelivery.items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0)
                  )}
                />
                <DetailRow label="Notes" value={viewDelivery.notes?.trim() || "-"} />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Line items</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium">Delivered</th>
                        <th className="px-3 py-2 font-medium">Empties</th>
                        <th className="px-3 py-2 font-medium">Price</th>
                        <th className="px-3 py-2 font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewDelivery.items ?? [])
                        .filter((item) => item.quantityDelivered > 0 || item.emptiesReceived > 0)
                        .map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-900">
                              {item.product.name}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{item.quantityDelivered}</td>
                            <td className="px-3 py-2 tabular-nums">{item.emptiesReceived}</td>
                            <td className="px-3 py-2 tabular-nums">
                              {money(item.sellingPriceSnapshot)}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{money(item.lineTotal)}</td>
                          </tr>
                        ))}
                      {(viewDelivery.items ?? []).filter(
                        (item) => item.quantityDelivered > 0 || item.emptiesReceived > 0
                      ).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                            No product lines on this delivery.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewDelivery(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelDelivery}
        onClose={() => setCancelDelivery(null)}
        onConfirm={() => {
          if (cancelDelivery) cancelDeliveryMutation.mutate(cancelDelivery.id);
        }}
        title="Cancel Delivery"
        description={
          cancelDelivery
            ? `Cancel delivery for ${cancelDelivery.customer.name}? Ledger and container movements will be reversed.`
            : ""
        }
        confirmLabel="Cancel Delivery"
        variant="destructive"
        isLoading={cancelDeliveryMutation.isPending}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StockCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: string;
    product: { id: string; name: string };
    filledCount: number;
    emptyCount: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Not recorded yet.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"
            >
              <span className="font-medium text-slate-900">{row.product.name}</span>
              <span className="text-slate-600">
                {row.filledCount} filled / {row.emptyCount} empty
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
