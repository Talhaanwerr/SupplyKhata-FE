/**
 * Session Cookie
 *
 * A lightweight, non-httpOnly cookie read by Next.js proxy for routing
 * decisions (redirect to /403, /account-suspended, etc.).
 *
 * This is NOT a security mechanism. The backend must enforce all
 * authorisation checks. This cookie is only for UX routing.
 */

import type { UserRole, TenantStatus } from "@/types";

export interface SessionPayload {
  role: UserRole;
  tenantStatus?: TenantStatus;
}

const COOKIE_NAME = "next-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const VALID_ROLES: ReadonlySet<string> = new Set(["SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"]);

const VALID_TENANT_STATUSES: ReadonlySet<string> = new Set([
  "ACTIVE",
  "TRIAL",
  "SUSPENDED",
  "INACTIVE",
]);

export function setSessionCookie(payload: SessionPayload): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(payload));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Strict${secure}`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
}

export function parseSessionCookie(cookieHeader: string): SessionPayload | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<SessionPayload>;
    if (!parsed.role || !VALID_ROLES.has(parsed.role)) return null;
    if (parsed.tenantStatus && !VALID_TENANT_STATUSES.has(parsed.tenantStatus)) {
      return { role: parsed.role };
    }
    return {
      role: parsed.role,
      tenantStatus: parsed.tenantStatus,
    };
  } catch {
    // Malformed cookie — treat as unauthenticated (do not throw)
    return null;
  }
}
