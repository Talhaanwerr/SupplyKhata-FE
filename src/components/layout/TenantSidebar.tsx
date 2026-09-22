"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  X,
  BarChart3,
  Package,
  Contact,
  Truck,
  Bike,
  ClipboardList,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { canAccessAny } from "@/lib/can-access";
import { PERMISSIONS } from "@/constants/permissions";
import { useSidebar } from "./sidebar-context";
import { TenantSwitcher } from "./TenantSwitcher";
import { useAuthStore } from "@/store/auth-store";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  /** Any of these permissions grants visibility. Undefined = any authenticated tenant user. */
  permissions?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  {
    href: "/products",
    labelKey: "products",
    icon: Package,
    permissions: [PERMISSIONS.PRODUCTS.READ, PERMISSIONS.PRODUCTS.MANAGE],
  },
  {
    href: "/customers",
    labelKey: "customers",
    icon: Contact,
    permissions: [PERMISSIONS.CUSTOMERS.READ, PERMISSIONS.CUSTOMERS.MANAGE],
  },
  {
    href: "/vehicles",
    labelKey: "vehicles",
    icon: Truck,
    permissions: [PERMISSIONS.VEHICLES.READ, PERMISSIONS.VEHICLES.MANAGE],
  },
  {
    href: "/delivery-runs",
    labelKey: "deliveryRuns",
    icon: ClipboardList,
    permissions: [PERMISSIONS.DELIVERY_RUNS.READ, PERMISSIONS.DELIVERY_RUNS.MANAGE],
  },
  {
    href: "/payments",
    labelKey: "payments",
    icon: Wallet,
    permissions: [PERMISSIONS.PAYMENTS.READ, PERMISSIONS.PAYMENTS.MANAGE],
  },
  {
    href: "/riders",
    labelKey: "riders",
    icon: Bike,
    permissions: [PERMISSIONS.USERS.READ, PERMISSIONS.USERS.MANAGE],
  },
  {
    href: "/users",
    labelKey: "users",
    icon: Users,
    permissions: [PERMISSIONS.USERS.READ, PERMISSIONS.USERS.MANAGE],
  },
  {
    href: "/roles",
    labelKey: "roles",
    icon: ShieldCheck,
    permissions: [PERMISSIONS.ROLES.READ, PERMISSIONS.ROLES.MANAGE],
  },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  {
    href: "/activity-logs",
    labelKey: "activityLogs",
    icon: ScrollText,
    permissions: [PERMISSIONS.AUDIT_LOGS.READ, PERMISSIONS.AUDIT_LOGS.MANAGE],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const t = useTranslations("nav");

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permissions || canAccessAny(user, item.permissions)
  );

  return (
    <div className="flex h-full flex-col">
      {/* Workspace switcher */}
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

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleItems.map(({ href, labelKey, icon: Icon }) => {
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

export function TenantSidebar() {
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
