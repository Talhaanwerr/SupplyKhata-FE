"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PermissionGuard } from "@/components/ui/permission-guard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { collectionsApi } from "@/lib/collections-api";
import { reportsApi } from "@/lib/reports-api";
import { areasApi } from "@/lib/areas-api";
import { staffApi } from "@/lib/staff-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  AREAS_QUERY_KEY,
  COLLECTIONS_QUERY_KEY,
  PAYMENTS_DASHBOARD_QUERY_KEY,
  PAYMENTS_QUERY_KEY,
  REPORTS_QUERY_KEY,
  STAFF_RIDERS_QUERY_KEY,
} from "@/constants/query-keys";
import type {
  CollectionBucket,
  CollectionListItem,
  CollectionVisitOutcome,
} from "@/types/collections";
import { canAccessAny } from "@/lib/can-access";
import { useAuthStore } from "@/store/auth-store";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const BUCKETS: { id: CollectionBucket; label: string }[] = [
  { id: "ALL", label: "All outstanding" },
  { id: "DUE_TODAY", label: "Due today" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "DUE_SOON", label: "Due soon" },
];

const OUTCOMES: { id: CollectionVisitOutcome; label: string }[] = [
  { id: "COLLECTED", label: "Collected (full)" },
  { id: "PARTIAL", label: "Partial" },
  { id: "PROMISED", label: "Promised to pay" },
  { id: "NO_CONTACT", label: "No contact" },
  { id: "SKIPPED", label: "Skipped" },
];

export function CollectionsView() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canManage = canAccessAny(user, [
    PERMISSIONS.COLLECTIONS.MANAGE,
    PERMISSIONS.COLLECTIONS.UPDATE,
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.USERS.READ,
  ]);

  const [tab, setTab] = useState<"list" | "performance">("list");
  const [date, setDate] = useState(today());
  const [bucket, setBucket] = useState<CollectionBucket>("ALL");
  const [areaId, setAreaId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [selected, setSelected] = useState<CollectionListItem | null>(null);

  const [outcome, setOutcome] = useState<CollectionVisitOutcome>("PARTIAL");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [promiseDate, setPromiseDate] = useState("");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  const areasQuery = useQuery({
    queryKey: [AREAS_QUERY_KEY, "collections"],
    queryFn: () => areasApi.list(),
  });
  const ridersQuery = useQuery({
    queryKey: [STAFF_RIDERS_QUERY_KEY, "collections"],
    queryFn: () => staffApi.list({ role: "rider", limit: 100 }),
    enabled: canManage,
  });

  const listQuery = useQuery({
    queryKey: [COLLECTIONS_QUERY_KEY, "list", date, bucket, areaId, riderId, search],
    queryFn: () =>
      collectionsApi.list({
        date,
        bucket,
        areaId: areaId || undefined,
        riderId: riderId || undefined,
        search: search || undefined,
      }),
    enabled: tab === "list",
  });

  const perfQuery = useQuery({
    queryKey: [REPORTS_QUERY_KEY, "collection-performance", from, to, riderId, areaId],
    queryFn: () =>
      reportsApi.collectionPerformance(from, to, riderId || undefined, areaId || undefined),
    enabled: tab === "performance",
  });

  const visitMutation = useApiMutation(
    () => {
      if (!selected) throw new Error("No customer");
      const amt = amount.trim() ? Number(amount) : undefined;
      return collectionsApi.recordVisit(selected.customerId, {
        outcome,
        amount: amt && amt > 0 ? amt : undefined,
        method:
          amt && amt > 0
            ? (method as "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "OTHER")
            : undefined,
        promiseDate: promiseDate || undefined,
        promiseAmount: promiseAmount.trim() ? Number(promiseAmount) : undefined,
        followUpDate: followUpDate || undefined,
        notes: notes.trim() || null,
        visitDate: date,
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [COLLECTIONS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [PAYMENTS_DASHBOARD_QUERY_KEY] });
        qc.invalidateQueries({ queryKey: [REPORTS_QUERY_KEY] });
        toast({ title: "Visit recorded", variant: "success" });
        setSelected(null);
        resetForm();
      },
      onError: (err) => {
        toast({
          title: "Could not record visit",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  function resetForm() {
    setOutcome("PARTIAL");
    setAmount("");
    setMethod("CASH");
    setPromiseDate("");
    setPromiseAmount("");
    setFollowUpDate("");
    setNotes("");
  }

  function openVisit(row: CollectionListItem) {
    resetForm();
    setSelected(row);
    setAmount(String(row.balance));
  }

  const items = listQuery.data?.data?.items ?? [];
  const areas = useMemo(() => areasQuery.data?.data ?? [], [areasQuery.data?.data]);

  return (
    <PermissionGuard
      permission={PERMISSIONS.COLLECTIONS.READ}
      fallback={
        <EmptyState
          title="Collections access required"
          description="Ask an owner for collections:read permission."
        />
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Collections"
          description="Field collection list, visits, and performance"
        />

        <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-slate-200 px-1 pb-2">
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
              tab === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Collection list
          </button>
          <button
            type="button"
            onClick={() => setTab("performance")}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
              tab === "performance" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Performance
          </button>
        </div>

        {tab === "list" ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Select
                value={bucket}
                onChange={(e) => setBucket(e.target.value as CollectionBucket)}
              >
                {BUCKETS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
              <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">All areas</option>
                {areas.map((a: { id: string; name: string }) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              {canManage && (
                <Select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
                  <option value="">All riders</option>
                  {(ridersQuery.data?.data?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.firstName} {r.lastName}
                    </option>
                  ))}
                </Select>
              )}
              <Input
                placeholder="Search name / phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:col-span-2 lg:col-span-1 xl:col-span-1"
              />
            </div>

            {listQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : listQuery.isError ? (
              <ErrorState title="Failed to load" onRetry={() => listQuery.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState title="No customers in this bucket" />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Age</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.customerId} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{row.name}</p>
                          <a
                            href={`tel:${row.phone}`}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            <Phone className="h-3 w-3" />
                            {row.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.areaName}</td>
                        <td className="px-4 py-3">
                          <span className="text-slate-700">{row.dueDate ?? "—"}</span>
                          {row.daysOverdue > 0 && (
                            <span className="mt-0.5 block text-xs text-red-600">
                              {row.daysOverdue}d overdue
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">{row.ageDays}d</td>
                        <td className="px-4 py-3 font-medium tabular-nums">{money(row.balance)}</td>
                        <td className="px-4 py-3 text-right">
                          <PermissionGuard permission={PERMISSIONS.COLLECTIONS.CREATE}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="whitespace-nowrap"
                              onClick={() => openVisit(row)}
                            >
                              Collect
                            </Button>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">All areas</option>
                {areas.map((a: { id: string; name: string }) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              {canManage && (
                <Select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
                  <option value="">All collectors</option>
                  {(ridersQuery.data?.data?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.firstName} {r.lastName}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            {perfQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : perfQuery.isError ? (
              <ErrorState title="Failed to load" onRetry={() => perfQuery.refetch()} />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium">
                    By collector
                  </p>
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2">Staff</th>
                        <th className="px-4 py-2">Visits</th>
                        <th className="px-4 py-2">Collected</th>
                        <th className="px-4 py-2">Promised</th>
                        <th className="px-4 py-2">No contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(perfQuery.data?.data?.collectors ?? []).map((c) => (
                        <tr key={c.staffId} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-medium">{c.name}</td>
                          <td className="px-4 py-2 tabular-nums">{c.visits}</td>
                          <td className="px-4 py-2 tabular-nums">{money(c.collectedAmount)}</td>
                          <td className="px-4 py-2 tabular-nums">{c.promisedCount}</td>
                          <td className="px-4 py-2 tabular-nums">{c.noContactCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(perfQuery.data?.data?.collectors ?? []).length === 0 && (
                    <p className="px-4 py-6 text-sm text-slate-500">No visits in range</p>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium">By area</p>
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2">Area</th>
                        <th className="px-4 py-2">Visits</th>
                        <th className="px-4 py-2">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(perfQuery.data?.data?.byArea ?? []).map((a) => (
                        <tr key={a.areaId} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-medium">{a.name}</td>
                          <td className="px-4 py-2 tabular-nums">{a.customersVisited}</td>
                          <td className="px-4 py-2 tabular-nums">{money(a.collectedAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(perfQuery.data?.data?.byArea ?? []).length === 0 && (
                    <p className="px-4 py-6 text-sm text-slate-500">No visits in range</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Collect / Update — {selected?.name}</DialogTitle>
            <DialogDescription>
              Balance {selected ? money(selected.balance) : ""}. Partial payments and promises are
              OK.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Outcome">
              <Select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as CollectionVisitOutcome)}
              >
                {OUTCOMES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Amount collected">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Method">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="EASYPAISA">Easypaisa</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Promise date">
                <Input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                />
              </FormField>
              <FormField label="Promise amount">
                <Input
                  inputMode="decimal"
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Follow-up date">
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </FormField>
            <FormField label="Notes">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={visitMutation.isPending}
              onClick={() => visitMutation.mutateAsync()}
            >
              {visitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
