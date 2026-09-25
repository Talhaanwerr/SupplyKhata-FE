"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Boxes } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { containerInventoryApi } from "@/lib/container-inventory-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { INT_RE } from "@/lib/form-number";
import { PERMISSIONS } from "@/constants/permissions";
import { CONTAINER_INVENTORY_QUERY_KEY } from "@/constants/query-keys";
import type { ContainerInventoryRow } from "@/types/container-inventory";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";

const EMPTY_ROWS: ContainerInventoryRow[] = [];

const adjustSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantityDelta: z
    .string()
    .regex(/^-?\d+$/, "Must be a whole number")
    .refine((v) => Number(v) !== 0, { message: "Delta cannot be zero" }),
  notes: z.string().max(500).optional(),
});

type AdjustValues = z.infer<typeof adjustSchema>;

export function ContainerInventoryView() {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [openingInputs, setOpeningInputs] = useState<Record<string, string>>({});
  const [openingErrors, setOpeningErrors] = useState<Record<string, string>>({});
  const [adjustOpen, setAdjustOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: containersEnabled, isLoading: flagLoading } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS
  );

  const { data: res, isLoading } = useQuery({
    queryKey: [CONTAINER_INVENTORY_QUERY_KEY],
    queryFn: () => containerInventoryApi.list(),
    enabled: containersEnabled,
  });
  const rows = res?.data ?? EMPTY_ROWS;
  const activeProductId =
    selectedProductId && rows.some((row) => row.productId === selectedProductId)
      ? selectedProductId
      : (rows[0]?.productId ?? "");

  const needsOpening = useMemo(() => rows.some((row) => !row.hasOpeningOnHand), [rows]);
  const negativeOnHand = useMemo(() => rows.filter((row) => row.onHand < 0), [rows]);
  const selected = rows.find((row) => row.productId === activeProductId) ?? null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { productId: "", quantityDelta: "", notes: "" },
  });

  const setOpening = useApiMutation(
    (items: Array<{ productId: string; quantity: number }>) =>
      containerInventoryApi.setOpening({ items }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [CONTAINER_INVENTORY_QUERY_KEY] });
        toast({ title: "Opening owned stock saved", variant: "success" });
        setOpeningInputs({});
      },
      onError: (err) => {
        toast({
          title: "Could not set opening stock",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  const adjust = useApiMutation(
    (values: AdjustValues) =>
      containerInventoryApi.adjust({
        productId: values.productId,
        quantityDelta: Number(values.quantityDelta),
        notes: values.notes?.trim() || null,
      }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [CONTAINER_INVENTORY_QUERY_KEY] });
        toast({ title: "Owned stock adjusted", variant: "success" });
        setAdjustOpen(false);
      },
      onError: (err) => setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  const submitOpening = () => {
    const items: Array<{ productId: string; quantity: number }> = [];
    const errs: Record<string, string> = {};
    for (const row of rows) {
      if (row.hasOpeningOnHand) continue;
      const raw = (openingInputs[row.productId] ?? "").trim();
      if (!raw) {
        errs[row.productId] = "Required for first-time setup";
        continue;
      }
      if (!INT_RE.test(raw)) {
        errs[row.productId] = "Whole number required";
        continue;
      }
      items.push({ productId: row.productId, quantity: Number(raw) });
    }
    if (Object.keys(errs).length > 0) {
      setOpeningErrors(errs);
      return;
    }
    if (items.length === 0) {
      toast({
        title: "Nothing to set",
        description: "Opening owned stock is already set for all products.",
        variant: "error",
      });
      return;
    }
    setOpeningErrors({});
    setOpening.mutate(items);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Container Inventory"
        description="Owned = total fleet. With customers = sum of customer balances. On hand ≈ owned − with customers (− on vehicles)."
        action={
          <PermissionGuard permission={PERMISSIONS.CONTAINERS.UPDATE}>
            <Button
              variant="outline"
              onClick={() => {
                reset({
                  productId: activeProductId || rows[0]?.productId || "",
                  quantityDelta: "",
                  notes: "",
                });
                setAdjustOpen(true);
              }}
              disabled={rows.length === 0}
            >
              Adjust owned stock
            </Button>
          </PermissionGuard>
        }
      />

      {(flagLoading || !containersEnabled) && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={Boxes}
            title={
              flagLoading
                ? "Loading…"
                : "Returnable container tracking is disabled for this workspace"
            }
            description={
              flagLoading
                ? "Checking feature access…"
                : "Contact the platform admin to enable the Returnable Containers feature."
            }
          />
        </div>
      )}

      {containersEnabled && (
        <>
          {negativeOnHand.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              On hand is negative for: {negativeOnHand.map((r) => r.productName).join(", ")}. Check
              opening owned stock or customer openings.
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading inventory…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No returnable products"
              description="Mark products as returnable (e.g. 19L / 13L cans) to track container inventory."
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <button
                    key={row.productId}
                    type="button"
                    onClick={() => setSelectedProductId(row.productId)}
                    className={`rounded-xl border p-4 text-left transition ${
                      activeProductId === row.productId
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{row.productName}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-slate-500">Owned</dt>
                        <dd className="font-medium text-slate-900">{row.ownedTotal}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">With customers</dt>
                        <dd className="font-medium text-slate-900">{row.withCustomers}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">On vehicles</dt>
                        <dd className="font-medium text-slate-900">{row.onVehicles}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">On hand</dt>
                        <dd
                          className={`font-semibold ${
                            row.onHand < 0 ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {row.onHand}
                        </dd>
                      </div>
                    </dl>
                  </button>
                ))}
              </div>

              {needsOpening && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Set opening owned stock</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    First-time fleet total per product (e.g. 60 × 19L). After this, use Adjust.
                  </p>
                  <div className="mt-4 space-y-3">
                    {rows
                      .filter((row) => !row.hasOpeningOnHand)
                      .map((row) => (
                        <div key={row.productId} className="grid gap-2 sm:grid-cols-[1fr_140px]">
                          <p className="text-sm font-medium text-slate-800">{row.productName}</p>
                          <div>
                            <Input
                              inputMode="numeric"
                              placeholder="e.g. 60"
                              value={openingInputs[row.productId] ?? ""}
                              onChange={(e) =>
                                setOpeningInputs((prev) => ({
                                  ...prev,
                                  [row.productId]: e.target.value,
                                }))
                              }
                            />
                            {openingErrors[row.productId] && (
                              <p className="mt-1 text-xs text-red-600">
                                {openingErrors[row.productId]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  <PermissionGuard permission={PERMISSIONS.CONTAINERS.UPDATE}>
                    <Button
                      className="mt-4"
                      onClick={submitOpening}
                      disabled={setOpening.isPending}
                    >
                      {setOpening.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save opening stock
                    </Button>
                  </PermissionGuard>
                </div>
              )}

              {selected && (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Customers holding {selected.productName}
                    </h3>
                  </div>
                  {selected.customersHolding.length === 0 ? (
                    <EmptyState
                      title="None with customers"
                      description="Create customers with opening containers, or deliver cans."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 font-medium">Customer</th>
                            <th className="px-4 py-3 font-medium">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.customersHolding.map((c) => (
                            <tr key={c.customerId} className="border-b border-slate-50">
                              <td className="px-4 py-3 text-slate-800">{c.customerName}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">{c.balance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <Dialog open={adjustOpen} onOpenChange={(v) => !v && setAdjustOpen(false)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adjust owned stock</DialogTitle>
                <DialogDescription>
                  Positive adds to fleet total; negative reduces (lost / recount).
                </DialogDescription>
              </DialogHeader>
              <form
                noValidate
                onSubmit={handleSubmit((v) => adjust.mutateAsync(v))}
                className="space-y-4"
              >
                {errors.root && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errors.root.message}
                  </p>
                )}
                <FormField label="Product" error={errors.productId?.message} required>
                  <Select {...register("productId")}>
                    <option value="">Select product</option>
                    {rows.map((row) => (
                      <option key={row.productId} value={row.productId}>
                        {row.productName} (owned {row.ownedTotal})
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Quantity delta" error={errors.quantityDelta?.message} required>
                  <Input
                    inputMode="numeric"
                    placeholder="e.g. 5 or -2"
                    {...register("quantityDelta")}
                  />
                </FormField>
                <FormField label="Notes" error={errors.notes?.message}>
                  <Input placeholder="Optional" {...register("notes")} />
                </FormField>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || adjust.isPending}>
                    {(isSubmitting || adjust.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
