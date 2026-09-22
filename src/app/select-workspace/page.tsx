"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants";
import type { WorkspaceTenant } from "@/types";

export default function SelectWorkspacePage() {
  const router = useRouter();
  const { user, pendingTenants, selectionToken, selectTenant } = useAuthStore();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Already fully authenticated → go to dashboard
  useEffect(() => {
    if (user) {
      router.replace(user.isSuperAdmin ? ROUTES.SUPER_ADMIN_DASHBOARD : ROUTES.TENANT_DASHBOARD);
    }
  }, [user, router]);

  // No pending selection → back to login
  useEffect(() => {
    if (!selectionToken && !user) {
      router.replace(ROUTES.LOGIN);
    }
  }, [selectionToken, user, router]);

  async function handleSelect(tenant: WorkspaceTenant) {
    if (selectingId) return;
    setSelectingId(tenant.id);
    setError(null);
    try {
      await selectTenant(tenant.id);
    } catch {
      setError("Could not enter this workspace. Please try again.");
      setSelectingId(null);
    }
  }

  if (!selectionToken && !user) {
    return null; // Redirecting
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
            <Building2 className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Choose a workspace</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account belongs to multiple workspaces. Pick one to continue.
          </p>
        </div>

        {/* Workspace list */}
        <div className="space-y-3">
          {pendingTenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelect(tenant)}
              disabled={!!selectingId}
              className="group hover:border-primary/60 focus-visible:ring-primary flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition">
                <Building2 className="text-primary h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{tenant.name}</p>
                <p className="truncate text-sm text-slate-400">{tenant.slug}</p>
              </div>
              {selectingId === tenant.id ? (
                <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <span className="group-hover:text-primary shrink-0 text-sm text-slate-300 transition">
                  →
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-400">
          Not your account?{" "}
          <a href={ROUTES.LOGIN} className="text-primary font-medium hover:underline">
            Sign in with a different email
          </a>
        </p>
      </div>
    </div>
  );
}
