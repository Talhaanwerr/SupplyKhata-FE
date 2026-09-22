"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { canAccess, canAccessAny } from "@/lib/can-access";
import { ROUTES } from "@/constants";

type Mode = "all" | "any";

interface RequirePermissionProps {
  /** Single permission or list. With mode="all" (default) user must hold every one. */
  permission: string | string[];
  /** "all" = AND (default). "any" = OR. */
  mode?: Mode;
  children: React.ReactNode;
}

/**
 * Client-side page gate. Hides content and redirects to /403 when the
 * current user lacks the required permission(s). Waits for auth init first
 * so a cold load does not false-positive redirect.
 */
export function RequirePermission({ permission, mode = "all", children }: RequirePermissionProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = mode === "any" ? canAccessAny(user, required) : canAccess(user, required);

  useEffect(() => {
    if (!isInitialized) return;
    if (!allowed) {
      router.replace(ROUTES.FORBIDDEN);
    }
  }, [isInitialized, allowed, router]);

  if (!isInitialized) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
