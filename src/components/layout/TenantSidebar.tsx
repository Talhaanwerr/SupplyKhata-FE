"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { canAccessAny } from "@/lib/can-access";
import { useSidebar } from "./sidebar-context";
import { TenantSwitcher } from "./TenantSwitcher";
import { useAuthStore } from "@/store/auth-store";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";
import { settingsApi } from "@/lib/settings-api";
import { SIDEBAR_NAV_QUERY_KEY } from "@/constants/query-keys";
import { splitNavByPlacement, TENANT_NAV_ITEMS, type TenantNavItem } from "@/constants/tenant-nav";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const t = useTranslations("nav");
  const { enabled: returnableContainersEnabled } = useFeatureFlag(
    FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS
  );
  const { enabled: plantFillEnabled } = useFeatureFlag(FEATURE_FLAG_SLUGS.PLANT_FILL);
  const [moreOpen, setMoreOpen] = useState(false);

  const sidebarNavQuery = useQuery({
    queryKey: [SIDEBAR_NAV_QUERY_KEY],
    queryFn: settingsApi.getSidebarNav,
  });

  const flagEnabled = (slug?: string) => {
    if (!slug) return true;
    if (slug === FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS) return returnableContainersEnabled;
    if (slug === FEATURE_FLAG_SLUGS.PLANT_FILL) return plantFillEnabled;
    return true;
  };

  const visibleItems = useMemo(
    () =>
      TENANT_NAV_ITEMS.filter(
        (item) =>
          (!item.permissions || canAccessAny(user, item.permissions)) &&
          flagEnabled(item.featureFlag)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flags from hooks above
    [user, returnableContainersEnabled, plantFillEnabled]
  );

  const { primary, more } = useMemo(
    () => splitNavByPlacement(visibleItems, sidebarNavQuery.data?.data?.more),
    [visibleItems, sidebarNavQuery.data?.data?.more]
  );

  const moreActive = more.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const showMoreExpanded = moreOpen || moreActive;

  function NavLink({ item }: { item: TenantNavItem }) {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
        {t(item.labelKey as Parameters<typeof t>[0])}
      </Link>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-3">
        <div className="min-w-0 flex-1">
          <TenantSwitcher />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-2 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {primary.map((item) => (
          <NavLink key={item.key} item={item} />
        ))}

        {more.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                moreActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
              aria-expanded={showMoreExpanded}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  showMoreExpanded ? "rotate-0" : "-rotate-90",
                  moreActive && "text-primary"
                )}
              />
              {t("more")}
            </button>
            {showMoreExpanded && (
              <div className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-200 pl-2">
                {more.map((item) => (
                  <NavLink key={item.key} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}

export function TenantSidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={close} />
      </aside>
    </>
  );
}
