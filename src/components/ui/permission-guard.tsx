"use client";

/**
 * PermissionGuard / PermissionGuardAny
 *
 * ⚠️  UX ONLY: Renders children only if the current user holds the
 * required permission(s). This does NOT replace backend authorization.
 *
 * @example — single permission
 * <PermissionGuard permission="users:create">
 *   <Button>Add User</Button>
 * </PermissionGuard>
 *
 * @example — multiple permissions (AND — user must hold all)
 * <PermissionGuard permission={["users:create", "users:update"]}>
 *   <Button>Manage Users</Button>
 * </PermissionGuard>
 *
 * @example — with fallback
 * <PermissionGuard permission="users:delete" fallback={<span>No access</span>}>
 *   <Button variant="destructive">Delete</Button>
 * </PermissionGuard>
 *
 * @example — OR logic (any one permission is enough)
 * <PermissionGuardAny permissions={["users:read", "users:manage"]}>
 *   <UserList />
 * </PermissionGuardAny>
 */

import { usePermission, usePermissions } from "@/hooks/use-permission";

// ─── PermissionGuard (AND) ────────────────────────────────────────────────────

interface PermissionGuardProps {
  /** Single permission or array (AND — user must hold ALL). */
  permission: string | string[];
  /** Rendered when the user does NOT have access. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}

// ─── PermissionGuardAny (OR) ──────────────────────────────────────────────────

interface PermissionGuardAnyProps {
  /** User must hold AT LEAST ONE of these permissions. */
  permissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuardAny({
  permissions,
  fallback = null,
  children,
}: PermissionGuardAnyProps) {
  const { canAny } = usePermissions();
  return <>{canAny(permissions) ? children : fallback}</>;
}
