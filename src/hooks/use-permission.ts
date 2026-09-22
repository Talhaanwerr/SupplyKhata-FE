"use client";

/**
 * usePermission — React hook for permission checks
 *
 * ⚠️  UX ONLY: Hides/shows UI elements. Backend enforces actual security.
 */

import { useAuthStore } from "@/store/auth-store";
import { canAccess, canAccessAny, hasRole } from "@/lib/can-access";
import type { UserRole } from "@/types";

/**
 * Returns true if the current user holds ALL the given permissions.
 *
 * @example
 * const canCreate = usePermission("users:create");
 * const canManage = usePermission(["users:create", "users:update"]);
 */
export function usePermission(required: string | string[]): boolean {
  const user = useAuthStore((s) => s.user);
  return canAccess(user, required);
}

/**
 * Returns true if the current user holds AT LEAST ONE of the given permissions.
 *
 * @example
 * const canView = usePermissionAny(["users:read", "users:manage"]);
 */
export function usePermissionAny(permissions: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  return canAccessAny(user, permissions);
}

/**
 * Returns true if the current user holds the given role(s).
 *
 * @example
 * const isTenantAdmin = useRole("TENANT_ADMIN");
 * const isAdminOrSuper = useRole(["TENANT_ADMIN", "SUPER_ADMIN"]);
 */
export function useRole(role: UserRole | UserRole[]): boolean {
  const user = useAuthStore((s) => s.user);
  return hasRole(user, role);
}

/**
 * Returns the full permission-check utilities bound to the current user.
 * Useful when you need multiple checks without multiple hook calls.
 *
 * @example
 * const { can, canAny, is } = usePermissions();
 * can("users:create")          // true/false
 * canAny(["users:read", ...])  // true/false
 * is("TENANT_ADMIN")           // true/false
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  return {
    can: (required: string | string[]) => canAccess(user, required),
    canAny: (permissions: string[]) => canAccessAny(user, permissions),
    is: (role: UserRole | UserRole[]) => hasRole(user, role),
    user,
  };
}
