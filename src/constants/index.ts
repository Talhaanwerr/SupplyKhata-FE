function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing required environment variable ${name}. Set it in .env.local (local) or deployment env (live).`
    );
  }
  return trimmed;
}

// NEXT_PUBLIC_* must be read with a static key so Next.js can inline them in the browser bundle.
// Dynamic access like process.env[name] is always undefined on the client.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "SupplyKhata";
export const APP_URL = requireEnv("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL);
export const API_URL = requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);

export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  SELECT_WORKSPACE: "/select-workspace",
  FORBIDDEN: "/403",
  ACCOUNT_SUSPENDED: "/account-suspended",
  SUPER_ADMIN_DASHBOARD: "/super-admin/dashboard",
  TENANT_DASHBOARD: "/dashboard",
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TENANT_ADMIN: "TENANT_ADMIN",
  TENANT_USER: "TENANT_USER",
} as const;
