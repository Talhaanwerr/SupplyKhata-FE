"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Flag,
  Settings,
  ScrollText,
  LogOut,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { useAuthStore } from "@/store/auth-store";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/super-admin/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/super-admin/tenants", labelKey: "tenants", icon: Building2 },
  { href: "/super-admin/users", labelKey: "users", icon: Users },
  { href: "/super-admin/plans", labelKey: "plans", icon: CreditCard },
  { href: "/super-admin/feature-flags", labelKey: "featureFlags", icon: Flag },
  { href: "/super-admin/audit-logs", labelKey: "auditLogs", icon: ScrollText },
  { href: "/super-admin/settings", labelKey: "settings", icon: Settings },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const t = useTranslations("nav");

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{t("superAdmin")}</span>
            <span className="text-xs text-slate-400">{t("platformMgmt")}</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
              {t(labelKey as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
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

export function SuperAdminSidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
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
