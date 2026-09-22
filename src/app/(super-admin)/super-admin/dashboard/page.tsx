"use client";

import Link from "next/link";
import { Building2, Users, AlertTriangle, Activity, Clock, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { tenantsApi } from "@/lib/tenants-api";
import { auditLogsApi } from "@/lib/audit-logs-api";

const STATS_QUERY_KEY = "tenant-stats";
const DASHBOARD_LOGS_KEY = "dashboard-audit-logs";

export default function SuperAdminDashboardPage() {
  const { data: statsRes } = useQuery({
    queryKey: [STATS_QUERY_KEY],
    queryFn: tenantsApi.stats,
    staleTime: 30_000,
  });

  const { data: logsRes } = useQuery({
    queryKey: [DASHBOARD_LOGS_KEY],
    queryFn: () => auditLogsApi.list({ limit: 5, page: 1 }),
    staleTime: 30_000,
  });

  const s = statsRes?.data;
  const logs = logsRes?.data?.items ?? [];

  const STATS = [
    {
      label: "Total Tenants",
      value: s ? String(s.total) : "—",
      icon: Building2,
      iconClass: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Active Tenants",
      value: s ? String(s.active) : "—",
      icon: Activity,
      iconClass: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Pending Tenants",
      value: s ? String(s.pending) : "—",
      icon: Clock,
      iconClass: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      label: "Suspended",
      value: s ? String(s.suspended) : "—",
      icon: AlertTriangle,
      iconClass: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Cancelled",
      value: s ? String(s.cancelled) : "—",
      icon: XCircle,
      iconClass: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      label: "Total Users",
      value: s ? String(s.totalUsers) : "—",
      icon: Users,
      iconClass: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Platform-wide overview and management"
        action={
          <Link
            href="/super-admin/tenants/create"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          >
            + New Tenant
          </Link>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            iconClassName={`${stat.iconClass} [&>svg]:${stat.iconColor}`}
          />
        ))}
      </div>

      {/* Recent audit logs */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent Audit Logs</h2>
          <Link href="/super-admin/audit-logs" className="text-primary text-xs hover:underline">
            View all
          </Link>
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">No audit logs yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {log.module}: {log.action}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {log.actorEmail ?? "system"}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  <StatusBadge status="active" />
                  <span className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
