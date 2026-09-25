"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { customersApi } from "@/lib/customers-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import { CUSTOMER_DETAIL_QUERY_KEY, CUSTOMERS_QUERY_KEY } from "@/constants/query-keys";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerLedgerTab } from "./CustomerLedgerTab";
import { CustomerContainerBalanceTab } from "./CustomerContainerBalanceTab";
import { CustomerDeliveryScheduleTab } from "./CustomerDeliveryScheduleTab";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";

type Tab = "pricing" | "ledger" | "containers" | "schedule";

export function CustomerDetailView() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pricing");
  const { enabled: containersEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS);
  const activeTab: Tab = tab === "containers" && !containersEnabled ? "pricing" : tab;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [CUSTOMER_DETAIL_QUERY_KEY, customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !!customerId,
  });

  const customer = res?.data;

  const remove = useApiMutation(() => customersApi.remove(customerId), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      toast({ title: "Customer deleted", variant: "success" });
      router.push("/customers");
    },
    onError: (err) => {
      toast({
        title: "Could not delete customer",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteOpen(false);
    },
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading customer…</div>;
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Customer not found.</p>
        <Link href="/customers" className="text-sm text-slate-700 underline">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/customers"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
        <PageHeader
          title={customer.name}
          description="Customer details, pricing, and balances"
          action={
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission={PERMISSIONS.CUSTOMERS.UPDATE}>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.CUSTOMERS.DELETE}>
                <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                  Delete
                </Button>
              </PermissionGuard>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Phone</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{customer.phone}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Email</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{customer.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Area</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{customer.area?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Status</p>
          <div className="mt-1">
            <StatusBadge status={customer.status} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Address</p>
          <p className="mt-1 text-sm text-slate-800">{customer.address}</p>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-slate-200 px-1">
        {(
          [
            ["pricing", "Pricing"],
            ["ledger", "Ledger"],
            ...(containersEnabled ? ([["containers", "Container Balance"]] as const) : []),
            ["schedule", "Delivery Schedule"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "pricing" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          {customer.productPrices.length === 0 ? (
            <EmptyState
              title="Using product defaults"
              description="No customer-specific prices set. Edit the customer to override prices."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Price / unit</th>
                    <th className="px-4 py-3 font-medium">Product default</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.productPrices.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="px-4 py-3 text-slate-800">{row.product.name}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.pricePerUnit}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.product.defaultSellingPrice}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "ledger" && (
        <CustomerLedgerTab
          customerId={customerId}
          promisedDueDate={customer.promisedDueDate}
          promisedDueAmount={customer.promisedDueAmount}
        />
      )}

      {tab === "containers" && containersEnabled && (
        <CustomerContainerBalanceTab customerId={customerId} />
      )}

      {activeTab === "schedule" && <CustomerDeliveryScheduleTab customerId={customerId} />}

      <CustomerFormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          qc.invalidateQueries({ queryKey: [CUSTOMER_DETAIL_QUERY_KEY, customerId] });
        }}
        customer={customer}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
        title="Delete Customer"
        description={`Delete "${customer.name}"? This cannot be undone from the list.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </div>
  );
}
