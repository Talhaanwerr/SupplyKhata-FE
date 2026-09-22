/**
 * canAccess — Pure permission helper
 *
 * ⚠️  UX ONLY: This function controls UI visibility only.
 * The backend MUST enforce all actual authorization checks.
 *
 * Rules:
 * - SUPER_ADMIN bypasses all permission checks (matches backend PermissionsGuard).
 * - Inactive users are denied all access.
 * - Otherwise, the user must hold every required permission string.
 */

import type { User, UserRole } from "@/types";

/**
 * Check if a user has one or more required permissions.
 * Pass a single string or an array — all must be granted (AND logic).
 */
export function canAccess(user: User | null | undefined, required: string | string[]): boolean {
  if (!user || !user.isActive) return false;

  // Super admins bypass all permission checks
  if (user.role === "SUPER_ADMIN") return true;

  const requirements = Array.isArray(required) ? required : [required];
  return requirements.every((perm) => user.permissions.includes(perm));
}

/**
 * Check if a user has at least one of the given permissions (OR logic).
 */
export function canAccessAny(user: User | null | undefined, permissions: string[]): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return permissions.some((perm) => user.permissions.includes(perm));
}

/**
 * Check if a user holds a specific role or one of several roles.
 */
export function hasRole(user: User | null | undefined, role: UserRole | UserRole[]): boolean {
  if (!user) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}
