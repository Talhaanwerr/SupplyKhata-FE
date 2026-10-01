import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  BarChart3,
  Package,
  Contact,
  Truck,
  Bike,
  ClipboardList,
  ShoppingCart,
  Wallet,
  Droplets,
  Receipt,
  HandCoins,
  Boxes,
  Banknote,
  CalendarDays,
  FileText,
} from "lucide-react";
import { PERMISSIONS } from "@/constants/permissions";
import { FEATURE_FLAG_SLUGS } from "@/types/feature-flags";

/** Stable keys — must match BE `SIDEBAR_NAV_KEYS`. */
export const TENANT_NAV_KEYS = [
  "dashboard",
  "products",
  "customers",
  "vehicles",
  "deliveryRuns",
  "orders",
  "invoices",
  "refillBatches",
  "expenses",
  "cashHandovers",
  "containerInventory",
  "payments",
  "plannedStops",
  "collections",
  "riders",
  "users",
  "roles",
  "reports",
  "activityLogs",
] as const;

export type TenantNavKey = (typeof TENANT_NAV_KEYS)[number];

export interface TenantNavItem {
  key: TenantNavKey;
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permissions?: string[];
  featureFlag?: string;
}

export const TENANT_NAV_ITEMS: TenantNavItem[] = [
  { key: "dashboard", href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  {
    key: "products",
    href: "/products",
    labelKey: "products",
    icon: Package,
    permissions: [PERMISSIONS.PRODUCTS.READ, PERMISSIONS.PRODUCTS.MANAGE],
  },
  {
    key: "customers",
    href: "/customers",
    labelKey: "customers",
    icon: Contact,
    permissions: [PERMISSIONS.CUSTOMERS.READ, PERMISSIONS.CUSTOMERS.MANAGE],
  },
  {
    key: "vehicles",
    href: "/vehicles",
    labelKey: "vehicles",
    icon: Truck,
    permissions: [PERMISSIONS.VEHICLES.READ, PERMISSIONS.VEHICLES.MANAGE],
  },
  {
    key: "deliveryRuns",
    href: "/delivery-runs",
    labelKey: "deliveryRuns",
    icon: ClipboardList,
    permissions: [PERMISSIONS.DELIVERY_RUNS.READ, PERMISSIONS.DELIVERY_RUNS.MANAGE],
  },
  {
    key: "orders",
    href: "/orders",
    labelKey: "orders",
    icon: ShoppingCart,
    permissions: [PERMISSIONS.ORDERS.READ, PERMISSIONS.ORDERS.CREATE],
    featureFlag: FEATURE_FLAG_SLUGS.ORDERS,
  },
  {
    key: "invoices",
    href: "/invoices",
    labelKey: "invoices",
    icon: FileText,
    permissions: [PERMISSIONS.INVOICES.READ, PERMISSIONS.INVOICES.CREATE],
    featureFlag: FEATURE_FLAG_SLUGS.INVOICES,
  },
  {
    key: "refillBatches",
    href: "/refill-batches",
    labelKey: "refillBatches",
    icon: Droplets,
    permissions: [PERMISSIONS.REFILL.READ, PERMISSIONS.REFILL.MANAGE],
    featureFlag: FEATURE_FLAG_SLUGS.PLANT_FILL,
  },
  {
    key: "expenses",
    href: "/expenses",
    labelKey: "expenses",
    icon: Receipt,
    permissions: [
      PERMISSIONS.EXPENSES.READ,
      PERMISSIONS.EXPENSES.MANAGE,
      PERMISSIONS.EXPENSES.CREATE,
    ],
  },
  {
    key: "cashHandovers",
    href: "/cash-handovers",
    labelKey: "cashHandovers",
    icon: HandCoins,
    permissions: [PERMISSIONS.HANDOVERS.READ, PERMISSIONS.HANDOVERS.MANAGE],
  },
  {
    key: "containerInventory",
    href: "/container-inventory",
    labelKey: "containerInventory",
    icon: Boxes,
    permissions: [PERMISSIONS.CONTAINERS.READ, PERMISSIONS.CONTAINERS.MANAGE],
    featureFlag: FEATURE_FLAG_SLUGS.RETURNABLE_CONTAINERS,
  },
  {
    key: "payments",
    href: "/payments",
    labelKey: "payments",
    icon: Wallet,
    permissions: [PERMISSIONS.PAYMENTS.READ, PERMISSIONS.PAYMENTS.MANAGE],
  },
  {
    key: "plannedStops",
    href: "/planned-stops",
    labelKey: "plannedStops",
    icon: CalendarDays,
    permissions: [PERMISSIONS.PLANNED_STOPS.READ, PERMISSIONS.PLANNED_STOPS.MANAGE],
  },
  {
    key: "collections",
    href: "/collections",
    labelKey: "collections",
    icon: Banknote,
    permissions: [PERMISSIONS.COLLECTIONS.READ, PERMISSIONS.COLLECTIONS.MANAGE],
  },
  {
    key: "riders",
    href: "/riders",
    labelKey: "riders",
    icon: Bike,
    permissions: [PERMISSIONS.USERS.READ, PERMISSIONS.USERS.MANAGE],
  },
  {
    key: "users",
    href: "/users",
    labelKey: "users",
    icon: Users,
    permissions: [PERMISSIONS.USERS.READ, PERMISSIONS.USERS.MANAGE],
  },
  {
    key: "roles",
    href: "/roles",
    labelKey: "roles",
    icon: ShieldCheck,
    permissions: [PERMISSIONS.ROLES.READ, PERMISSIONS.ROLES.MANAGE],
  },
  {
    key: "reports",
    href: "/reports",
    labelKey: "reports",
    icon: BarChart3,
    permissions: [PERMISSIONS.REPORTS.READ, PERMISSIONS.REPORTS.MANAGE],
  },
  {
    key: "activityLogs",
    href: "/activity-logs",
    labelKey: "activityLogs",
    icon: ScrollText,
    permissions: [PERMISSIONS.AUDIT_LOGS.READ, PERMISSIONS.AUDIT_LOGS.MANAGE],
  },
];

export function splitNavByPlacement<T extends { key: TenantNavKey }>(
  items: T[],
  moreKeys: string[] | undefined | null
): { primary: T[]; more: T[] } {
  const moreSet = new Set(
    (moreKeys ?? []).filter((k): k is TenantNavKey => TENANT_NAV_KEYS.includes(k as TenantNavKey))
  );
  const primary: T[] = [];
  const moreOrdered: T[] = [];
  const byKey = new Map(items.map((i) => [i.key, i]));

  for (const item of items) {
    if (!moreSet.has(item.key)) primary.push(item);
  }
  for (const key of moreKeys ?? []) {
    const item = byKey.get(key as TenantNavKey);
    if (item && moreSet.has(item.key)) moreOrdered.push(item);
  }
  return { primary, more: moreOrdered };
}
