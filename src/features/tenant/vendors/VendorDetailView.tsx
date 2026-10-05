"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { vendorsApi } from "@/lib/vendors-api";
import { vendorBillsApi } from "@/lib/vendor-bills-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  VENDOR_BILLS_QUERY_KEY,
  VENDOR_DETAIL_QUERY_KEY,
  VENDORS_QUERY_KEY,
} from "@/constants/query-keys";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { VendorFormModal } from "./VendorFormModal";
import { VendorLedgerSection } from "./VendorLedgerSection";

export function VendorDetailView() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id;
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "ledger">("overview");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { enabled: billsEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.VENDOR_BILLS);

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [VENDOR_DETAIL_QUERY_KEY, vendorId],
    queryFn: () => vendorsApi.get(vendorId),
    enabled: !!vendorId,
  });

  const billsQuery = useQuery({
    queryKey: [VENDOR_BILLS_QUERY_KEY, "by-vendor", vendorId],
    queryFn: () => vendorBillsApi.list({ vendorId, limit: 10 }),
    enabled: !!vendorId && billsEnabled,
  });

  const vendor = res?.data;
  const isActive = vendor?.isActive === true;
  const recentBills = billsQuery.data?.data?.items ?? [];

  const toggleStatus = useApiMutation(() => vendorsApi.update(vendorId, { isActive: !isActive }), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [VENDOR_DETAIL_QUERY_KEY, vendorId] });
      setToggleOpen(false);
      toast({
        title: isActive ? "Vendor deactivated" : "Vendor activated",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: isActive ? "Could not deactivate" : "Could not activate",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading vendor…</div>;
  }

  if (isError || !vendor) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Vendor not found.</p>
        <Link href="/vendors" className="text-sm text-slate-700 underline">
          Back to vendors
        </Link>
      </div>
    );
  }

  const payablesTotal = vendor.openPayables?.total ?? 0;
  const billedTotal = vendor.openPayables?.billedTotal ?? 0;
  const paidTotal = vendor.openPayables?.paidTotal ?? 0;
  const payablesNote = vendor.openPayables?.note;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vendors"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Vendors
        </Link>
        <PageHeader
          title={vendor.name}
          description="Supplier details, payables, and ledger"
          action={
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission={PERMISSIONS.VENDORS.UPDATE}>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setToggleOpen(true)}>
                  {isActive ? (
                    <>
                      <UserX className="h-4 w-4 text-amber-600" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Activate
                    </>
                  )}
                </Button>
              </PermissionGuard>
            </div>
          }
        />
      </div>

      {billsEnabled ? (
        <div className="flex gap-2 border-b border-slate-200">
          {(
            [
              ["overview", "Overview"],
              ["ledger", "Ledger"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                tab === key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "overview" ? (
        <>
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Phone</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{vendor.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Status</p>
              <div className="mt-1">
                <StatusBadge status={isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Total billed
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{billedTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Total paid
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{paidTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Still to pay
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-800">
                {payablesTotal.toFixed(2)}
              </p>
              {payablesNote && <p className="mt-0.5 text-xs text-slate-500">{payablesNote}</p>}
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Address</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{vendor.address || "—"}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Notes</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{vendor.notes || "—"}</p>
            </div>
          </div>

          {billsEnabled ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Recent bills</h3>
                <div className="flex gap-3 text-sm">
                  <Link href="/vendor-bills/dues" className="text-slate-600 underline">
                    Payables due
                  </Link>
                  <Link href="/vendor-bills" className="text-slate-600 underline">
                    All bills
                  </Link>
                </div>
              </div>
              {recentBills.length === 0 ? (
                <p className="text-sm text-slate-500">No bills yet for this vendor.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentBills.map((b) => (
                    <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                      <Link href={`/vendor-bills/${b.id}`} className="font-medium hover:underline">
                        {b.billNumber} · {b.status.replace(/_/g, " ")}
                      </Link>
                      <span className="text-slate-600">
                        {b.dueDate ? `Due ${new Date(b.dueDate).toLocaleDateString()} · ` : ""}
                        {b.remaining.toFixed(2)} remaining / {b.totalAmount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-800">Vendor bills disabled</p>
              <p className="mt-1 text-sm text-slate-500">
                Enable the Vendor Bills flag to track payables and bill history.
              </p>
            </div>
          )}
        </>
      ) : (
        <VendorLedgerSection vendorId={vendorId} />
      )}

      <VendorFormModal open={editOpen} onClose={() => setEditOpen(false)} vendor={vendor} />

      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={() => toggleStatus.mutate()}
        title={isActive ? "Deactivate Vendor" : "Activate Vendor"}
        description={
          isActive
            ? `Deactivate "${vendor.name}"? Soft-deactivate only — no hard delete.`
            : `Activate "${vendor.name}" again?`
        }
        confirmLabel={isActive ? "Deactivate" : "Activate"}
        isLoading={toggleStatus.isPending}
      />
    </div>
  );
}
