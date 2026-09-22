"use client";

import Link from "next/link";
import { Users, ShieldCheck, Activity, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardsSkeleton } from "@/components/ui/skeletons";
import { usersApi } from "@/lib/users-api";
import { rolesApi } from "@/lib/roles-api";
import { auditLogsApi } from "@/lib/audit-logs-api";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useAuthStore } from "@/store/auth-store";

const DASH_USERS_KEY = "tenant-dashboard-users";
const DASH_ACTIVE_USERS_KEY = "tenant-dashboard-active-users";
const DASH_ROLES_KEY = "tenant-dashboard-roles";
const DASH_LOGS_KEY = "tenant-dashboard-logs";

export function TenantDashboard() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const canUsers = usePermission(PERMISSIONS.USERS.READ);
  const canRoles = usePermission(PERMISSIONS.ROLES.READ);
  const canLogs = usePermission(PERMISSIONS.AUDIT_LOGS.READ);

  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: [DASH_USERS_KEY, activeTenant?.id],
    queryFn: () => usersApi.list({ page: 1, limit: 1 }),
    enabled: canUsers,
    staleTime: 30_000,
  });

  const { data: activeUsersRes, isLoading: activeUsersLoading } = useQuery({
    queryKey: [DASH_ACTIVE_USERS_KEY, activeTenant?.id],
    queryFn: () => usersApi.list({ page: 1, limit: 1, status: "ACTIVE" }),
    enabled: canUsers,
    staleTime: 30_000,
  });

  const { data: rolesRes, isLoading: rolesLoading } = useQuery({
    queryKey: [DASH_ROLES_KEY, activeTenant?.id],
    queryFn: () => rolesApi.list({ page: 1, limit: 1 }),
    enabled: canRoles,
    staleTime: 30_000,
  });

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: [DASH_LOGS_KEY, activeTenant?.id],
    queryFn: () => auditLogsApi.list({ page: 1, limit: 8 }),
    enabled: canLogs,
    staleTime: 30_000,
  });

  const loading =
    (canUsers && (usersLoading || activeUsersLoading)) ||
    (canRoles && rolesLoading) ||
    (canLogs && logsLoading);

  const totalUsers = usersRes?.data?.meta.total;
  const activeUsers = activeUsersRes?.data?.meta.total;
  const totalRoles = rolesRes?.data?.meta.total;
  const totalActivities = logsRes?.data?.meta.total;
  const recentLogs = logsRes?.data?.items ?? [];

  const stats = [
    {
      label: "Total Users",
      value: canUsers && totalUsers !== undefined ? String(totalUsers) : "—",
      icon: Users,
      href: canUsers ? "/users" : undefined,
    },
    {
      label: "Active Roles",
      value: canRoles && totalRoles !== undefined ? String(totalRoles) : "—",
      icon: ShieldCheck,
      href: canRoles ? "/roles" : undefined,
    },
    {
      label: "Activity Logs",
      value: canLogs && totalActivities !== undefined ? String(totalActivities) : "—",
      icon: Activity,
      href: canLogs ? "/activity-logs" : undefined,
    },
    {
      label: "Active Members",
      value: canUsers && activeUsers !== undefined ? String(activeUsers) : "—",
      icon: UserCheck,
      href: canUsers ? "/users" : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={
          activeTenant?.name ? `Welcome to ${activeTenant.name}` : "Welcome to your workspace"
        }
      />

      {loading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const card = <StatCard label={s.label} value={s.value} icon={s.icon} />;
            if (!s.href) {
              return <div key={s.label}>{card}</div>;
            }
            return (
              <Link key={s.label} href={s.href} className="block transition hover:opacity-90">
                {card}
              </Link>
            );
          })}
        </div>
      )}

      {canLogs && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            <Link href="/activity-logs" className="text-primary text-xs hover:underline">
              View all
            </Link>
          </div>
          {logsLoading ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : recentLogs.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">No activity yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {log.module}: {log.action}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {log.actorEmail ?? log.actorName ?? "system"}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
