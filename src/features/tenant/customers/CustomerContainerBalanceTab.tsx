"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
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
import { customersApi } from "@/lib/customers-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  CONTAINER_INVENTORY_QUERY_KEY,
  CUSTOMER_CONTAINER_BALANCE_QUERY_KEY,
} from "@/constants/query-keys";
import type { CustomerContainerBalanceRow } from "@/types/customers";

const adjustSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantityDelta: z
    .string()
    .regex(/^-?\d+$/, "Must be a whole number (can be negative)")
    .refine((v) => Number(v) !== 0, { message: "Delta cannot be zero" }),
  notes: z.string().max(500).optional(),
});

type AdjustValues = z.infer<typeof adjustSchema>;

interface CustomerContainerBalanceTabProps {
  customerId: string;
}

export function CustomerContainerBalanceTab({ customerId }: CustomerContainerBalanceTabProps) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerContainerBalanceRow | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: res, isLoading } = useQuery({
    queryKey: [CUSTOMER_CONTAINER_BALANCE_QUERY_KEY, customerId],
    queryFn: () => customersApi.containerBalance(customerId),
  });
  const rows = res?.data ?? [];

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

  const openAdjust = (row?: CustomerContainerBalanceRow) => {
    setSelected(row ?? null);
    reset({
      productId: row?.productId ?? "",
      quantityDelta: "",
      notes: "",
    });
    setAdjustOpen(true);
  };

  const adjust = useApiMutation(
    (values: AdjustValues) =>
      customersApi.adjustContainers(customerId, {
        productId: values.productId,
        quantityDelta: Number(values.quantityDelta),
        notes: values.notes?.trim() || null,
      }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [CUSTOMER_CONTAINER_BALANCE_QUERY_KEY, customerId] });
        qc.invalidateQueries({ queryKey: [CONTAINER_INVENTORY_QUERY_KEY] });
        toast({ title: "Container balance updated", variant: "success" });
        setAdjustOpen(false);
      },
      onError: (err) => setError("root", { message: getSafeErrorMessage(err) }),
    }
  );

  const columns: Column<CustomerContainerBalanceRow>[] = [
    {
      key: "product",
      header: "Product",
      render: (row) => <span className="font-medium text-slate-900">{row.productName}</span>,
    },
    {
      key: "balance",
      header: "With customer",
      render: (row) => (
        <span className={row.balance > 0 ? "font-semibold text-slate-900" : "text-slate-500"}>
          {row.balance}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <PermissionGuard permission={PERMISSIONS.CUSTOMERS.UPDATE}>
          <Button type="button" variant="outline" size="sm" onClick={() => openAdjust(row)}>
            Adjust
          </Button>
        </PermissionGuard>
      ),
    },
  ];

  if (!isLoading && rows.length === 0) {
    return (
      <EmptyState
        title="No returnable products"
        description="Create a returnable product (e.g. 19L Can) to track containers."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PermissionGuard permission={PERMISSIONS.CUSTOMERS.UPDATE}>
          <Button type="button" variant="outline" size="sm" onClick={() => openAdjust()}>
            Adjust containers
          </Button>
        </PermissionGuard>
      </div>

      <DataTable columns={columns} data={rows} isLoading={isLoading} />

      <Dialog open={adjustOpen} onOpenChange={(v) => !v && setAdjustOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust container balance</DialogTitle>
            <DialogDescription>
              Use a positive number to add cans with this customer, negative to remove.
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
              <Select {...register("productId")} disabled={!!selected}>
                <option value="">Select product</option>
                {rows.map((row) => (
                  <option key={row.productId} value={row.productId}>
                    {row.productName} (now {row.balance})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity delta" error={errors.quantityDelta?.message} required>
              <Input
                inputMode="numeric"
                placeholder="e.g. 2 or -1"
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
                {(isSubmitting || adjust.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
