"use client";

/**
 * RoleGuard
 *
 * ⚠️  UX ONLY: Renders children only if the current user holds the
 * specified role(s). This does NOT replace backend authorization.
 *
 * @example
 * // Single role
 * <RoleGuard role="SUPER_ADMIN">
 *   <AdminPanel />
 * </RoleGuard>
 *
 * // Multiple roles (OR — user must hold at least one)
 * <RoleGuard role={["TENANT_ADMIN", "SUPER_ADMIN"]}>
 *   <ManageButton />
 * </RoleGuard>
 *
 * // With fallback
 * <RoleGuard role="TENANT_ADMIN" fallback={<p>Admins only</p>}>
 *   <SettingsForm />
 * </RoleGuard>
 */

import { useRole } from "@/hooks/use-permission";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  role: UserRole | UserRole[];
  /** Rendered when the user does NOT have the role. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ role, fallback = null, children }: RoleGuardProps) {
  const allowed = useRole(role);
  return <>{allowed ? children : fallback}</>;
}
