// ─── Workspace (Tenant) ───────────────────────────────────────────────────────

/** Slim workspace representation returned by login and /auth/me for the switcher. */
export interface WorkspaceTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

// ─── Role / Status enums ───────────────────────────────────────────────────────

/**
 * FE-side role, derived from the BE `isSuperAdmin` boolean.
 * Used only for UX routing and session-cookie hints. Backend enforces real RBAC.
 */
export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "TENANT_USER";

export type UserStatus = "ACTIVE" | "INACTIVE" | "INVITED";

export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "INACTIVE" | "PENDING" | "CANCELLED";

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * FE User — populated from the BE login / /auth/me response.
 *
 * `role`, `name`, and `isActive` are FE-computed conveniences derived from the
 * raw BE fields (`isSuperAdmin`, `firstName`+`lastName`, `status`).
 *
 * `permissions` is a UX-only flat list of "module:action" strings populated
 * after login. ⚠️ Backend enforces actual security.
 */
export interface User {
  // ── BE fields ────────────────────────────────────────────────────────────
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl?: string | null;
  timezone?: string | null;
  createdAt: string;

  // ── FE-computed ──────────────────────────────────────────────────────────
  /** `${firstName} ${lastName}` — convenience field */
  name: string;
  /** Derived from `isSuperAdmin`. SUPER_ADMIN → bypasses all permission checks. */
  role: UserRole;
  /** `status === "ACTIVE"` */
  isActive: boolean;
  /**
   * Flat list of "module:action" strings. Loaded after login via
   * the current user's roles. ⚠️ UX ONLY — backend enforces security.
   */
  permissions: string[];
  /**
   * Active-tenant role labels from /auth/me (e.g. "Tenant Owner").
   * Prefer this for profile UI; `role` remains the coarse FE routing hint.
   */
  roles?: Array<{ id: string; name: string; slug: string }>;
}

// ─── Shared API response wrappers ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
