"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { AUDIT_LOGS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { AuditLogItem } from "@/types/audit-logs";

const MODULE_OPTIONS = [
  { value: "", label: "All Modules" },
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "settings", label: "Settings" },
  { value: "files", label: "Files" },
  { value: "notifications", label: "Notifications" },
];

export function ActivityLogsTable() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLogItem | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);

  const { data: res, isLoading } = usePaginatedQuery<AuditLogItem>({
    queryKey: [AUDIT_LOGS_QUERY_KEY, "tenant", page, moduleFilter, search, pageSize],
    path: "/audit-logs",
    params: {
      page,
      limit: pageSize,
      module: moduleFilter || undefined,
      search: search || undefined,
    },
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
      key: "entity",
      header: "Entity",
      render: (r) =>
        r.entityId ? (
          <span className="text-sm text-slate-600">
            {r.module} <span className="text-xs text-slate-400">#{r.entityId.slice(0, 8)}</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "actor",
      header: "Performed By",
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {r.actorName ?? r.actorEmail ?? "System"}
          </p>
          {r.actorEmail && r.actorName && <p className="text-xs text-slate-400">{r.actorEmail}</p>}
        </div>
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
          placeholder="Search by action or actor…"
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
            illustration="logs"
            title="No activity yet"
            description="Actions performed in your workspace will appear here."
          />
        }
      />

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity detail</DialogTitle>
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

                <dt className="text-slate-400">Module</dt>
                <dd className="font-mono text-slate-900">{detail.module}</dd>

                <dt className="text-slate-400">Action</dt>
                <dd className="font-mono text-slate-900">{detail.action}</dd>

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
