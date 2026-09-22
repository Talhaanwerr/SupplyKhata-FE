import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type { WorkspaceTenant } from "@/types";

// ─── BE response shapes ───────────────────────────────────────────────────────
// These match the NestJS backend exactly. The auth store maps them to the FE
// User type after receiving them.

export interface BELoginUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

export interface BEMeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  status: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  timezone: string | null;
  createdAt: string;
  /** Flat "module:action" strings loaded from the user's roles. Super admins receive []. */
  permissions: string[];
  /** Roles in the active tenant (display names). Super Admin gets a synthetic entry. */
  roles: Array<{ id: string; name: string; slug: string }>;
  /** All workspaces this user belongs to (ACTIVE memberships). */
  tenants: WorkspaceTenant[];
  /** Currently active workspace. */
  activeTenant: WorkspaceTenant | null;
}

export interface LoginTokens {
  /** Short-lived in-memory access token */
  accessToken: string;
  /**
   * Refresh token is set as an httpOnly cookie by the backend.
   * @deprecated Use the httpOnly cookie instead.
   */
  refreshToken?: string;
  user: BELoginUser;
}

/** Returned by /auth/login when the user belongs to multiple workspaces. */
export interface LoginSelectionRequired {
  requiresTenantSelection: true;
  selectionToken: string;
  tenants: WorkspaceTenant[];
}

export type LoginResult = LoginTokens | LoginSelectionRequired;

export interface RefreshTokens {
  /** New short-lived access token */
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * POST /auth/login
   * Returns either:
   *   - `LoginTokens` (single workspace or super admin)
   *   - `LoginSelectionRequired` (user has multiple workspaces)
   */
  login(credentials: LoginCredentials): Promise<ApiEnvelope<LoginResult>> {
    return apiClient.post<ApiEnvelope<LoginResult>>("/auth/login", credentials);
  },

  /**
   * POST /auth/select-tenant — step 2 for multi-workspace login.
   * Exchange the short-lived selectionToken for full session tokens.
   */
  selectTenant(selectionToken: string, tenantId: string): Promise<ApiEnvelope<LoginTokens>> {
    return apiClient.post<ApiEnvelope<LoginTokens>>("/auth/select-tenant", {
      selectionToken,
      tenantId,
    });
  },

  /**
   * POST /auth/switch-tenant — switch active workspace without re-login.
   * Returns a new access token; the httpOnly refresh cookie is rotated.
   */
  switchTenant(tenantId: string): Promise<ApiEnvelope<RefreshTokens>> {
    return apiClient.post<ApiEnvelope<RefreshTokens>>("/auth/switch-tenant", { tenantId });
  },

  /** POST /auth/logout */
  logout(): Promise<void> {
    return apiClient.post<void>("/auth/logout");
  },

  /**
   * POST /auth/refresh — the httpOnly "rt" cookie is sent automatically
   * via credentials: "include". No body required.
   * The BE rotates the cookie and returns a new accessToken.
   */
  refresh(): Promise<ApiEnvelope<RefreshTokens>> {
    return apiClient.post<ApiEnvelope<RefreshTokens>>("/auth/refresh");
  },

  /** GET /auth/me — returns the currently authenticated user's full profile */
  me(): Promise<ApiEnvelope<BEMeUser>> {
    return apiClient.get<ApiEnvelope<BEMeUser>>("/auth/me");
  },

  /** POST /auth/forgot-password */
  forgotPassword(email: string): Promise<ApiEnvelope<null>> {
    return apiClient.post<ApiEnvelope<null>>("/auth/forgot-password", { email });
  },

  resetPassword(token: string, password: string, name?: string): Promise<ApiEnvelope<null>> {
    return apiClient.post<ApiEnvelope<null>>("/auth/reset-password", {
      token,
      password,
      ...(name ? { name } : {}),
    });
  },

  verifyEmail(token: string): Promise<ApiEnvelope<null>> {
    return apiClient.post<ApiEnvelope<null>>("/auth/verify-email", { token });
  },

  resendVerification(email: string): Promise<ApiEnvelope<null>> {
    return apiClient.post<ApiEnvelope<null>>("/auth/resend-verification", { email });
  },

  changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiEnvelope<null>> {
    return apiClient.post<ApiEnvelope<null>>("/auth/change-password", data);
  },

  /**
   * Accept an invite by setting a password via the reset-password endpoint.
   * After this call succeeds, the user should be redirected to login.
   */
  acceptInvite(data: {
    token: string;
    password: string;
    name?: string;
  }): Promise<ApiEnvelope<null>> {
    return apiClient.post<ApiEnvelope<null>>("/auth/reset-password", {
      token: data.token,
      password: data.password,
      ...(data.name ? { name: data.name } : {}),
    });
  },

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    timezone?: string;
    avatarUrl?: string | null;
  }): Promise<
    ApiEnvelope<{
      id: string;
      firstName: string;
      lastName: string;
      timezone: string | null;
      avatarUrl: string | null;
    }>
  > {
    return apiClient.patch("/auth/me", data);
  },

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return apiClient.post<ApiEnvelope<{ id: string; avatarUrl: string | null }>>(
      "/auth/me/avatar",
      form
    );
  },

  clearAvatar: () =>
    apiClient.delete<ApiEnvelope<{ id: string; avatarUrl: string | null }>>("/auth/me/avatar"),

  // ─── TOTP ─────────────────────────────────────────────────────────────────

  /**
   * POST /auth/totp/setup
   * Step 1: generates a new TOTP secret. Returns secret + OTP Auth URI for QR.
   */
  totpSetup(): Promise<ApiEnvelope<{ secret: string; otpAuthUri: string }>> {
    return apiClient.post<ApiEnvelope<{ secret: string; otpAuthUri: string }>>("/auth/totp/setup");
  },

  /**
   * POST /auth/totp/enable
   * Step 2: verify the first code from the authenticator app.
   */
  totpEnable(code: string): Promise<ApiEnvelope<{ message: string }>> {
    return apiClient.post<ApiEnvelope<{ message: string }>>("/auth/totp/enable", { code });
  },

  /**
   * POST /auth/totp/disable
   * Disable TOTP — requires a valid current code.
   */
  totpDisable(code: string): Promise<ApiEnvelope<{ message: string }>> {
    return apiClient.post<ApiEnvelope<{ message: string }>>("/auth/totp/disable", { code });
  },

  /**
   * POST /auth/totp/verify
   * Step 2 of TOTP-protected login.
   */
  totpVerify(totpToken: string, code: string): Promise<ApiEnvelope<LoginTokens>> {
    return apiClient.post<ApiEnvelope<LoginTokens>>("/auth/totp/verify", { totpToken, code });
  },
};
