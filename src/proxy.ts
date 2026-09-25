import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionCookie } from "@/lib/session-cookie";

// ─── Route definitions ────────────────────────────────────────────────────────

/** Fully public — no session required. */
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/select-workspace",
];

/** Public prefix patterns (e.g. /invite/abc123). */
const PUBLIC_PREFIXES = ["/invite/"];

/** Always reachable (auth status handled per-route below). */
const ALWAYS_ALLOWED = ["/403", "/account-suspended"];

/** Routes that require SUPER_ADMIN role. */
const SUPER_ADMIN_PREFIXES = ["/super-admin"];

/** Tenant app routes (any authenticated non-suspended user). */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/products",
  "/customers",
  "/users",
  "/roles",
  "/permissions",
  "/settings",
  "/feature-flags",
  "/profile",
  "/activity-logs",
  "/billing",
  "/reports",
  "/branches",
  "/vehicles",
  "/delivery-runs",
  "/payments",
  "/riders",
  "/collections",
  "/planned-stops",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED.includes(pathname);
}

function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ─── Proxy (Next.js 16) ───────────────────────────────────────────────────────

/**
 * UX routing only — not a security boundary.
 * Backend JWT + RBAC/permissions must enforce real authorization.
 *
 * Next.js 16: `middleware.ts` → `proxy.ts` (named export `proxy`).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Same-origin API rewrite to Railway — must pass through (runs before rewrite).
  // Gating these redirects POST /api/v1/auth/login → /login?redirect=... → 405.
  if (pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const session = parseSessionCookie(cookieHeader);
  const isAuthenticated = session !== null;

  // Static error / status pages
  if (isAlwaysAllowed(pathname)) {
    return NextResponse.next();
  }

  // Public auth pages
  if (isPublic(pathname)) {
    if (isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
      if (session.tenantStatus === "SUSPENDED") {
        return NextResponse.redirect(new URL("/account-suspended", request.url));
      }
      const destination = session.role === "SUPER_ADMIN" ? "/super-admin/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // Everything else requires a session cookie hint
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Suspended tenants — lock down the app
  if (session.tenantStatus === "SUSPENDED" && pathname !== "/account-suspended") {
    return NextResponse.redirect(new URL("/account-suspended", request.url));
  }

  // Super-admin area
  if (isSuperAdminRoute(pathname) && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  // Tenant protected routes — authenticated is enough for UX gate
  if (isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
