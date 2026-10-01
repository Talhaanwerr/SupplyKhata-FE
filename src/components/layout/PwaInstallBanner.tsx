"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BannerKind = "none" | "ios" | "listen";

function isStandaloneDisplay(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

function readBannerKind(): BannerKind {
  if (isStandaloneDisplay()) return "none";
  try {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return "none";
  } catch {
    /* private mode */
  }
  if (isIosDevice()) return "ios";
  return "listen";
}

/** No cross-tab subscribe needed; dismiss is handled in React state. */
function subscribeBannerKind() {
  return () => {};
}

/**
 * Soft install help in the tenant shell.
 * Android/Chromium: beforeinstallprompt → Install button.
 * iOS: Share → Add to Home Screen tip only.
 */
export function PwaInstallBanner() {
  const t = useTranslations("pwa");
  const envKind = useSyncExternalStore(
    subscribeBannerKind,
    readBannerKind,
    () => "none" as BannerKind
  );
  const [userDismissed, setUserDismissed] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  const kind = userDismissed ? "none" : envKind;

  useEffect(() => {
    if (kind !== "listen") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [kind]);

  const dismiss = useCallback(() => {
    setUserDismissed(true);
    setDeferred(null);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") dismiss();
  }, [deferred, dismiss]);

  const showAndroid = Boolean(deferred);
  const showIosTip = kind === "ios";

  if (kind === "none") return null;
  if (!showAndroid && !showIosTip) return null;

  return (
    <div
      role="region"
      aria-label={t("regionLabel")}
      className="flex shrink-0 items-start gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6"
    >
      <div className="bg-primary/10 text-primary mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        {showAndroid ? (
          <Download className="h-4 w-4" aria-hidden />
        ) : (
          <Share className="h-4 w-4" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {showAndroid ? t("installTitle") : t("iosTitle")}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          {showAndroid ? t("installBody") : t("iosBody")}
        </p>
        {showAndroid ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onInstall}>
              {t("installCta")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              {t("dismiss")}
            </Button>
          </div>
        ) : (
          <div className="mt-2">
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              {t("dismiss")}
            </Button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
