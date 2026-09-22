"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/** Map raw path segments to human-readable labels. */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "super-admin": "Super Admin",
  tenants: "Tenants",
  users: "Users",
  plans: "Plans",
  billing: "Billing",
  "feature-flags": "Feature Flags",
  "audit-logs": "Audit Logs",
  settings: "Settings",
  roles: "Roles & Permissions",
  permissions: "Permissions",
  profile: "My Profile",
  "activity-logs": "Activity Logs",
  reports: "Reports",
  create: "Create",
  edit: "Edit",
};

function toLabel(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  // Build cumulative href list, skipping dynamic segments that look like IDs
  const crumbs = segments.map((seg, i) => ({
    label: toLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      <Link href="/" className="text-slate-400 transition-colors hover:text-slate-600">
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          {crumb.isLast ? (
            <span className="font-medium text-slate-800">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
