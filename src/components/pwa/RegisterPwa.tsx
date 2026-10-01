"use client";

import { useEffect } from "react";

/**
 * Explicit SW registration for production.
 * next-pwa also auto-registers when webpack inject works; this covers App Router
 * cases where the inject entry is missing. No-op in `next dev` (PWA disabled).
 */
export function RegisterPwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const run = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("[PWA] service worker registration failed", err);
      });
    };

    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
  }, []);

  return null;
}
