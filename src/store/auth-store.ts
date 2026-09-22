"use client";

import { create } from "zustand";
import { authApi } from "@/lib/auth";
import { tokenManager } from "@/lib/token";
import { setSessionCookie, clearSessionCookie } from "@/lib/session-cookie";
import {
  savePendingWorkspaceSelection,
  loadPendingWorkspaceSelection,
  clearPendingWorkspaceSelection,
} from "@/lib/pending-workspace";
import { ROUTES } from "@/constants";
import type { User, UserRole, UserStatus, WorkspaceTenant } from "@/types";
import type { BELoginUser, BEMeUser, LoginCredentials, LoginTokens } from "@/lib/auth";

// ─── BE → FE user mapping ─────────────────────────────────────────────────────

function deriveRole(isSuperAdmin: boolean): UserRole {
  return isSuperAdmin ? "SUPER_ADMIN" : "TENANT_USER";
}

/** Map the slim login-response user to the FE User shape. */
function mapLoginUser(be: BELoginUser): User {
  return {
    id: be.id,
    email: be.email,
    firstName: be.firstName,
    lastName: be.lastName,
    name: `${be.firstName} ${be.lastName}`.trim(),
    tenantId: be.tenantId ?? null,
    isSuperAdmin: be.isSuperAdmin,
    role: deriveRole(be.isSuperAdmin),
    status: "ACTIVE",
    isActive: true,
    emailVerified: true,
    avatarUrl: null,
    timezone: null,
    permissions: [],
    roles: [],
    createdAt: new Date().toISOString(),
  };
}

/** Map the full /auth/me response to the FE User shape. */
function mapMeUser(be: BEMeUser): User {
  return {
    id: be.id,
    email: be.email,
    firstName: be.firstName,
    lastName: be.lastName,
    name: `${be.firstName} ${be.lastName}`.trim(),
    tenantId: be.tenantId ?? null,
    isSuperAdmin: be.isSuperAdmin,
    role: deriveRole(be.isSuperAdmin),
    status: (be.status as UserStatus) ?? "ACTIVE",
    isActive: be.status === "ACTIVE",
    emailVerified: be.emailVerified,
    avatarUrl: be.avatarUrl,
    timezone: be.timezone,
    permissions: [...new Set(be.permissions ?? [])],
    roles: be.roles ?? [],
    createdAt: be.createdAt,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  /** Set when login returns requiresTenantSelection. Cleared after selectTenant(). */
  pendingTenants: WorkspaceTenant[];
  /** Short-lived JWT used to pick a workspace. Cleared after selectTenant(). */
  selectionToken: string | null;
  /** All active workspaces for the current user. Populated from /auth/me. */
  userTenants: WorkspaceTenant[];
  /** Currently active workspace. */
  activeTenant: WorkspaceTenant | null;

  login: (credentials: LoginCredentials, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Step 2 of multi-workspace login. Exchanges the selectionToken for full
   * session tokens and navigates to the dashboard.
   */
  selectTenant: (tenantId: string) => Promise<void>;
  /**
   * Switch the active workspace for an already-authenticated user.
   * Rotates tokens and reloads the page so all data is re-fetched with
   * the new tenant context.
   */
  switchTenant: (tenantId: string) => Promise<void>;
  /**
   * Called on app mount to restore session from the stored refresh token.
   * Calls /auth/refresh → then /auth/me to hydrate user state.
   */
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  pendingTenants: [],
  selectionToken: null,
  userTenants: [],
  activeTenant: null,

  setUser(user) {
    set({ user });
  },

  async login(credentials, redirectTo) {
    set({ isLoading: true });
    try {
      const envelope = await authApi.login(credentials);
      const payload = envelope.data;

      if (!payload) throw new Error("Login failed: empty response");

      // ── Multi-workspace: redirect to workspace picker ────────────────────
      // Persist to sessionStorage — window.location clears in-memory Zustand,
      // and multi-tenant login does NOT set a refresh cookie yet.
      if ("requiresTenantSelection" in payload && payload.requiresTenantSelection) {
        savePendingWorkspaceSelection({
          selectionToken: payload.selectionToken,
          tenants: payload.tenants,
        });
        set({
          pendingTenants: payload.tenants,
          selectionToken: payload.selectionToken,
          isLoading: false,
          isInitialized: true,
        });
        window.location.href = ROUTES.SELECT_WORKSPACE;
        return;
      }

      clearPendingWorkspaceSelection();

      // ── Single workspace / super admin: proceed directly ─────────────────
      const tokens = payload as LoginTokens;
      tokenManager.setAccessToken(tokens.accessToken);

      let feUser = mapLoginUser(tokens.user);
      let userTenants: WorkspaceTenant[] = [];
      let activeTenant: WorkspaceTenant | null = null;

      try {
        const meEnvelope = await authApi.me();
        if (meEnvelope.data) {
          feUser = mapMeUser(meEnvelope.data);
          userTenants = meEnvelope.data.tenants ?? [];
          activeTenant = meEnvelope.data.activeTenant ?? null;
        }
      } catch {
        // Non-fatal: continue with slim login user if /auth/me fails
      }

      setSessionCookie({ role: feUser.role });
      set({ user: feUser, userTenants, activeTenant, isLoading: false });

      if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
        window.location.href = redirectTo;
        return;
      }

      window.location.href = feUser.isSuperAdmin
        ? ROUTES.SUPER_ADMIN_DASHBOARD
        : ROUTES.TENANT_DASHBOARD;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  async selectTenant(tenantId) {
    const { selectionToken } = get();
    const token = selectionToken ?? loadPendingWorkspaceSelection()?.selectionToken ?? null;
    if (!token) throw new Error("No pending workspace selection");

    set({ isLoading: true });
    try {
      const envelope = await authApi.selectTenant(token, tenantId);
      const payload = envelope.data;
      if (!payload) throw new Error("Workspace selection failed");

      tokenManager.setAccessToken(payload.accessToken);
      clearPendingWorkspaceSelection();
      set({ pendingTenants: [], selectionToken: null });

      let feUser = mapLoginUser(payload.user);
      let userTenants: WorkspaceTenant[] = [];
      let activeTenant: WorkspaceTenant | null = null;

      try {
        const meEnvelope = await authApi.me();
        if (meEnvelope.data) {
          feUser = mapMeUser(meEnvelope.data);
          userTenants = meEnvelope.data.tenants ?? [];
          activeTenant = meEnvelope.data.activeTenant ?? null;
        }
      } catch {
        // Non-fatal
      }

      setSessionCookie({ role: feUser.role });
      set({ user: feUser, userTenants, activeTenant, isLoading: false });

      window.location.href = ROUTES.TENANT_DASHBOARD;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  async switchTenant(tenantId) {
    set({ isLoading: true });
    try {
      const envelope = await authApi.switchTenant(tenantId);
      const payload = envelope.data;
      if (!payload) throw new Error("Workspace switch failed");

      tokenManager.setAccessToken(payload.accessToken);

      // Reload the page — this ensures all React Query caches are cleared and
      // the new tenant context is applied cleanly across the entire app.
      window.location.reload();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  async logout() {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Continue logout flow even if the API call fails
    } finally {
      tokenManager.clearAll();
      clearSessionCookie();
      clearPendingWorkspaceSelection();
      set({
        user: null,
        isLoading: false,
        isInitialized: true,
        pendingTenants: [],
        selectionToken: null,
        userTenants: [],
        activeTenant: null,
      });
      window.location.href = ROUTES.LOGIN;
    }
  },

  async initialize() {
    // Prevent React Strict Mode double-mount from racing two refreshes
    // (first succeeds and rotates cookie; second fails and wipes the session).
    if (get().isInitialized || get().isLoading) {
      return;
    }

    set({ isLoading: true });

    // Multi-workspace login: restore picker state after full-page navigation.
    // No refresh cookie exists yet — calling /auth/refresh would 401 and kick to login.
    const pending = loadPendingWorkspaceSelection();
    if (pending?.selectionToken) {
      set({
        pendingTenants: pending.tenants,
        selectionToken: pending.selectionToken,
        user: null,
        isLoading: false,
        isInitialized: true,
        userTenants: [],
        activeTenant: null,
      });
      return;
    }

    try {
      const refreshEnvelope = await authApi.refresh();
      const tokens = refreshEnvelope.data;

      if (!tokens) throw new Error("Session expired");

      tokenManager.setAccessToken(tokens.accessToken);

      const meEnvelope = await authApi.me();
      const meUser = meEnvelope.data;

      if (!meUser) throw new Error("Failed to load user profile");

      const feUser = mapMeUser(meUser);

      setSessionCookie({ role: feUser.role });
      set({
        user: feUser,
        userTenants: meUser.tenants ?? [],
        activeTenant: meUser.activeTenant ?? null,
        isLoading: false,
        isInitialized: true,
      });
    } catch {
      tokenManager.clearAll();
      clearSessionCookie();
      set({
        user: null,
        isLoading: false,
        isInitialized: true,
        pendingTenants: [],
        selectionToken: null,
        userTenants: [],
        activeTenant: null,
      });
    }
  },
}));
