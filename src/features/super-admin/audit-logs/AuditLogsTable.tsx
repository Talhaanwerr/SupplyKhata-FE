"use client";

import { useState } from "react";
import { Eye, ScrollText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { auditLogsApi } from "@/lib/audit-logs-api";
import { AUDIT_LOGS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { AuditLogItem } from "@/types/audit-logs";

const MODULE_OPTIONS = [
  { value: "", label: "All modules" },
  { value: "tenants", label: "Tenants" },
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "feature-flags", label: "Feature Flags" },
  { value: "settings", label: "Settings" },
  { value: "files", label: "Files" },
  { value: "audit-logs", label: "Audit Logs" },
];

function flagSummary(log: AuditLogItem): string | null {
  const nv = log.newValue;
  if (!nv || typeof nv !== "object") return null;
  const slug = "slug" in nv && typeof nv.slug === "string" ? nv.slug : null;
  const flagName = "flagName" in nv && typeof nv.flagName === "string" ? nv.flagName : null;
  if (flagName && slug) return `${flagName} (${slug})`;
  if (slug) return slug;
  if (flagName) return flagName;
  return null;
}

function tenantLabel(log: AuditLogItem): string {
  if (log.tenant?.name) return log.tenant.name;
  const nv = log.newValue;
  if (nv && typeof nv === "object" && "name" in nv && typeof nv.name === "string") {
    return nv.name;
  }
  return "—";
}

export function AuditLogsTable() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLogItem | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: res, isLoading } = useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, "sa", page, search, moduleFilter, pageSize],
    queryFn: () =>
      auditLogsApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        module: moduleFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const items = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const columns: Column<AuditLogItem>[] = [
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          {r.module}:{r.action}
        </code>
      ),
    },
    {
      key: "summary",
      header: "What",
      render: (r) => {
        const flag = flagSummary(r);
        const what =
          flag ??
          (r.module === "tenants"
            ? tenantLabel(r)
            : r.entityId
              ? `#${r.entityId.slice(0, 8)}`
              : "—");
        return <span className="text-sm text-slate-700">{what}</span>;
      },
    },
    {
      key: "actor",
      header: "Actor",
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {r.actorName ?? r.actorEmail ?? "System"}
          </p>
          {r.actorEmail && <p className="text-xs text-slate-400">{r.actorEmail}</p>}
        </div>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      render: (r) => (
        <span className="text-sm text-slate-700">
          {r.tenant ? (
            <>
              {r.tenant.name} <span className="text-xs text-slate-400">/{r.tenant.slug}</span>
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (r) => (
        <span className="text-xs whitespace-nowrap text-slate-400">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (r) => (
        <button
          type="button"
          aria-label="View log details"
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => setDetail(r)}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search module, action, actor, tenant…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          className="w-44"
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
        >
          {MODULE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={ScrollText}
            title="No audit logs yet"
            description="Actions performed on the platform will appear here."
          />
        }
      />

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit log detail</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.module}:${detail.action}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
                <dt className="text-slate-400">Actor</dt>
                <dd className="text-slate-900">
                  {detail.actorName ?? "System"}
                  {detail.actorEmail ? (
                    <span className="block text-xs text-slate-500">{detail.actorEmail}</span>
                  ) : null}
                </dd>

                <dt className="text-slate-400">Tenant</dt>
                <dd className="text-slate-900">
                  {detail.tenant ? `${detail.tenant.name} (/${detail.tenant.slug})` : "—"}
                </dd>

                <dt className="text-slate-400">Module</dt>
                <dd className="font-mono text-slate-900">{detail.module}</dd>

                <dt className="text-slate-400">Action</dt>
                <dd className="font-mono text-slate-900">{detail.action}</dd>

                <dt className="text-slate-400">Feature</dt>
                <dd className="text-slate-900">{flagSummary(detail) ?? "—"}</dd>

                <dt className="text-slate-400">Entity ID</dt>
                <dd className="font-mono text-xs break-all text-slate-700">
                  {detail.entityId ?? "—"}
                </dd>

                <dt className="text-slate-400">IP</dt>
                <dd className="text-slate-900">{detail.ipAddress ?? "—"}</dd>

                <dt className="text-slate-400">Time</dt>
                <dd className="text-slate-900">{new Date(detail.createdAt).toLocaleString()}</dd>
              </dl>

              {detail.oldValue != null && (
                <div>
                  <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                    Before
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(detail.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {detail.newValue != null && (
                <div>
                  <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                    After / Details
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(detail.newValue, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
