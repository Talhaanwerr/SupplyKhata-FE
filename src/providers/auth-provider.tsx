"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

/**
 * Restores the in-memory access token after full page loads.
 * Login uses window.location redirect, which clears memory — initialize()
 * calls /auth/refresh (httpOnly cookie) then /auth/me.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Avoid flashing protected UI before session restore finishes
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  return <>{children}</>;
}
