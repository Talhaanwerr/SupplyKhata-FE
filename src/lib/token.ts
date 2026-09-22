/**
 * Token Management
 *
 * Access token: in-memory only (short-lived, cleared on page reload — expected).
 *
 * Refresh token: managed as an httpOnly cookie by the backend.
 *   - Set by: POST /auth/login and POST /auth/refresh (on rotation)
 *   - Cleared by: POST /auth/logout
 *   - Sent automatically: browser includes it on requests to /api/v1/auth/*
 *   - Never accessible to JavaScript (XSS safe)
 *
 * The frontend never stores or reads the refresh token directly.
 * Sessions survive page reloads because the httpOnly cookie persists across
 * page loads and the browser sends it automatically to the refresh endpoint.
 */

let accessToken: string | null = null;

export const tokenManager = {
  // ─── Access token (in-memory, ~15min lifetime) ─────────────────────────
  getAccessToken(): string | null {
    return accessToken;
  },
  setAccessToken(token: string): void {
    accessToken = token;
  },
  clearAccessToken(): void {
    accessToken = null;
  },
  hasAccessToken(): boolean {
    return accessToken !== null;
  },

  // ─── Session teardown ─────────────────────────────────────────────────
  // The backend clears the httpOnly cookie on /auth/logout.
  // We only need to wipe the in-memory access token on the frontend.
  clearAll(): void {
    accessToken = null;
  },
};
