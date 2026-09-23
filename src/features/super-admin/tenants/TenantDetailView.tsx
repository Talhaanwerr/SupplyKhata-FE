"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff, ShieldCheck, XCircle, AlertCircle, Trash2, Mail } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { tenantsApi } from "@/lib/tenants-api";
import { TENANTS_QUERY_KEY, TENANT_DETAIL_QUERY_KEY } from "@/constants/query-keys";
import { ApiError } from "@/lib/api-error";

interface TenantDetailViewProps {
  tenantId: string;
}

type StatusAction = "suspend" | "activate" | "cancel";

export function TenantDetailView({ tenantId }: TenantDetailViewProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<StatusAction | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    data: res,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [TENANT_DETAIL_QUERY_KEY, tenantId],
    queryFn: () => tenantsApi.getOne(tenantId),
  });

  const tenant = res?.data;

  async function handleDelete() {
    setIsDeleting(true);
    setActionError("");
    try {
      await tenantsApi.delete(tenantId);
      await qc.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      router.push("/super-admin/tenants");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete tenant.");
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleAction(act: StatusAction) {
    setIsActing(true);
    setActionError("");
    try {
      if (act === "suspend") await tenantsApi.suspend(tenantId);
      else if (act === "activate") await tenantsApi.activate(tenantId);
      else await tenantsApi.cancel(tenantId);

      await qc.invalidateQueries({ queryKey: [TENANT_DETAIL_QUERY_KEY, tenantId] });
      await qc.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setIsActing(false);
      setDialog(null);
    }
  }

  async function handleResendInvite() {
    setIsResending(true);
    setActionError("");
    try {
      const result = await tenantsApi.resendOwnerInvite(tenantId);
      const email = result.data?.owner.email ?? tenant?.owner?.email ?? "owner";
      toast({
        title: "Invite sent",
        description: `Invite email sent to ${email}.`,
        variant: "success",
      });
      await qc.invalidateQueries({ queryKey: [TENANT_DETAIL_QUERY_KEY, tenantId] });
      setResendOpen(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to resend invite email.";
      setActionError(message);
      toast({ title: "Invite not sent", description: message, variant: "error" });
    } finally {
      setIsResending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        <AlertCircle className="h-5 w-5 shrink-0" />
        Failed to load tenant. Please try again.
      </div>
    );
  }

  const initials = tenant.name.slice(0, 2).toUpperCase();
  const memberCount = tenant._count?.members ?? tenant._count?.users ?? "—";
  const canResendInvite = !!tenant.owner && tenant.status !== "CANCELLED";
  const ownerNeedsAccept =
    tenant.owner?.memberStatus === "INVITED" || tenant.owner?.emailVerified === false;

  const details = [
    { label: "Slug", value: tenant.slug },
    { label: "Domain", value: tenant.domain ?? "—" },
    { label: "Plan", value: tenant.subscriptions?.[0]?.plan?.name ?? "—" },
    { label: "Users", value: String(memberCount) },
    { label: "Timezone", value: tenant.timezone ?? "—" },
    { label: "Created", value: new Date(tenant.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Info card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <span className="text-primary text-xl font-bold">{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{tenant.name}</h2>
                <p className="text-sm text-slate-400">/{tenant.slug}</p>
              </div>
            </div>
            <StatusBadge status={tenant.status} />
          </div>

          <div className="flex flex-wrap gap-2">
            {canResendInvite && (
              <Button variant="outline" size="sm" onClick={() => setResendOpen(true)}>
                <Mail className="h-4 w-4 text-blue-600" />
                Resend invite
              </Button>
            )}
            {tenant.status !== "ACTIVE" && (
              <Button variant="outline" size="sm" onClick={() => setDialog("activate")}>
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Activate
              </Button>
            )}
            {tenant.status === "ACTIVE" && (
              <Button variant="outline" size="sm" onClick={() => setDialog("suspend")}>
                <ShieldOff className="h-4 w-4 text-yellow-600" />
                Suspend
              </Button>
            )}
            {tenant.status !== "CANCELLED" && (
              <Button variant="outline" size="sm" onClick={() => setDialog("cancel")}>
                <XCircle className="h-4 w-4 text-red-600" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Owner card */}
      {tenant.owner && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Workspace owner</h3>
              <p className="text-sm font-medium text-slate-900">
                {tenant.owner.firstName} {tenant.owner.lastName}
              </p>
              <p className="text-sm text-slate-500">{tenant.owner.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tenant.owner.emailVerified
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {tenant.owner.emailVerified ? "Email verified" : "Email not verified"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tenant.owner.memberStatus === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : tenant.owner.memberStatus === "INVITED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Membership: {tenant.owner.memberStatus}
                </span>
              </div>
              {tenant.owner.emailVerified && tenant.owner.emailVerifiedAt && (
                <p className="text-xs text-slate-400">
                  Verified {new Date(tenant.owner.emailVerifiedAt).toLocaleString()}
                </p>
              )}
            </div>
            {canResendInvite && (
              <Button variant="outline" size="sm" onClick={() => setResendOpen(true)}>
                <Mail className="h-4 w-4" />
                Resend invite
              </Button>
            )}
          </div>
          {ownerNeedsAccept && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Owner has not accepted the invite / set a password yet. Email stays unverified until
              they open the invite link and set their password. Use Resend invite if the email
              failed or was missed.
            </p>
          )}
        </div>
      )}

      {!tenant.owner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No owner assigned on this tenant.
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {details.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Subscription table (if any) */}
      {(tenant.subscriptions?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Subscriptions</h3>
          <div className="divide-y divide-slate-100">
            {tenant.subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-slate-900">{sub.plan.name}</span>
                <StatusBadge status={sub.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="mb-1 text-sm font-semibold text-red-700">Danger Zone</h3>
        <p className="mb-4 text-sm text-red-600">
          Permanently delete this tenant and all its data. This cannot be undone.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-red-300 text-red-600 hover:bg-red-100"
          onClick={() => {
            setDeleteOpen(true);
            setDeleteConfirmName("");
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete Tenant
        </Button>
      </div>

      <ConfirmDialog
        open={resendOpen}
        onClose={() => setResendOpen(false)}
        onConfirm={handleResendInvite}
        title="Resend owner invite"
        description={
          tenant.owner
            ? `Send a fresh invite email to ${tenant.owner.email}? Previous unused invite links for this workspace will be invalidated.`
            : "Send a fresh invite email to the workspace owner?"
        }
        confirmLabel="Send invite"
        isLoading={isResending}
      />

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        onConfirm={() => handleAction("suspend")}
        title="Suspend Tenant"
        description="This will prevent all users of this tenant from accessing the platform."
        confirmLabel="Suspend"
        variant="destructive"
        isLoading={isActing}
      />
      <ConfirmDialog
        open={dialog === "activate"}
        onClose={() => setDialog(null)}
        onConfirm={() => handleAction("activate")}
        title="Activate Tenant"
        description="This will grant dashboard access for all users of this tenant."
        confirmLabel="Activate"
        isLoading={isActing}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        onConfirm={() => handleAction("cancel")}
        title="Cancel Tenant"
        description="This will permanently cancel the tenant. This action cannot be undone."
        confirmLabel="Cancel Tenant"
        variant="destructive"
        isLoading={isActing}
      />
      {/* Delete confirmation dialog — type tenant name to confirm */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Delete Tenant</h3>
            <p className="mb-4 text-sm text-slate-600">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-900">{tenant.name}</span> and all its data.
              Type{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-red-600">
                {tenant.name}
              </code>{" "}
              below to confirm.
            </p>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={tenant.name}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={deleteConfirmName !== tenant.name || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Permanently
              </Button>
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
