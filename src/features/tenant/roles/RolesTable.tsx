"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { rolesApi } from "@/lib/roles-api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { RoleModal } from "./RoleModal";
import { RolePermissionsModal } from "./RolePermissionsModal";
import { ROLES_QUERY_KEY } from "@/constants/query-keys";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { RoleItem } from "@/types/roles";

interface RolesTableProps {
  /** Called from the page so the "New Role" button can open the create modal */
  onCreateRef?: (fn: () => void) => void;
}

export function RolesTable({ onCreateRef }: RolesTableProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const [editRole, setEditRole] = useState<RoleItem | null>(null);
  const [permRole, setPermRole] = useState<RoleItem | null>(null);
  const [confirmRole, setConfirmRole] = useState<RoleItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Expose the create-modal opener to the parent via ref callback.
  // Must be in useEffect to avoid calling a state setter during render.
  useEffect(() => {
    onCreateRef?.(() => setCreateOpen(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: res, isLoading } = useQuery({
    queryKey: [ROLES_QUERY_KEY, page, search, pageSize],
    queryFn: () =>
      rolesApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const roles: RoleItem[] = res?.data?.items ?? [];
  const totalPages = res?.data?.meta.totalPages ?? 1;

  const del = useApiMutation((id: string) => rolesApi.delete(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      setConfirmRole(null);
    },
    onError: (err) => {
      toast({
        title: "Could not delete role",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setConfirmRole(null);
    },
  });

  const columns: Column<RoleItem>[] = [
    {
      key: "name",
      header: "Role",
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <code className="text-xs text-slate-400">{r.slug}</code>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (r) => <span className="text-slate-500">{r.description ?? "—"}</span>,
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (r) => <span className="tabular-nums">{r.permissions.length}</span>,
    },
    {
      key: "users",
      header: "Users",
      render: (r) => <span className="tabular-nums">{r._count?.userRoles ?? "—"}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (r) =>
        r.isSystem ? (
          <span className="text-xs font-medium text-amber-600">System</span>
        ) : (
          <span className="text-xs text-slate-400">Custom</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          {/* Manage permissions */}
          <PermissionGuard permission={PERMISSIONS.ROLES.UPDATE}>
            <button
              onClick={() => setPermRole(r)}
              className="hover:text-primary rounded p-1.5 text-slate-400 hover:bg-slate-100"
              title="Manage permissions"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          </PermissionGuard>

          {/* Edit (custom only) */}
          {!r.isSystem && (
            <PermissionGuard permission={PERMISSIONS.ROLES.UPDATE}>
              <button
                onClick={() => setEditRole(r)}
                className="hover:text-primary rounded p-1.5 text-slate-400 hover:bg-slate-100"
                title="Edit role"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </PermissionGuard>
          )}

          {/* Delete (custom only) */}
          {!r.isSystem && (
            <PermissionGuard permission={PERMISSIONS.ROLES.DELETE}>
              <button
                onClick={() => {
                  if ((r._count?.userRoles ?? 0) > 0) {
                    toast({
                      title: "Cannot delete role",
                      description: `Assigned to ${r._count?.userRoles} user(s). Unassign it first.`,
                      variant: "error",
                    });
                    return;
                  }
                  setConfirmRole(r);
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                title="Delete role"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </PermissionGuard>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <SearchInput
          placeholder="Search roles…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            illustration="roles"
            title="No roles yet"
            description="Create roles to control what your team members can access."
          />
        }
      />

      {/* Create modal */}
      <RoleModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit modal */}
      <RoleModal role={editRole} open={!!editRole} onClose={() => setEditRole(null)} />

      {/* Permissions modal */}
      <RolePermissionsModal role={permRole} open={!!permRole} onClose={() => setPermRole(null)} />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmRole}
        onClose={() => setConfirmRole(null)}
        onConfirm={() => del.mutate(confirmRole!.id)}
        title="Delete Role"
        description={
          (confirmRole?._count?.userRoles ?? 0) > 0
            ? `"${confirmRole?.name}" is assigned to ${confirmRole?._count?.userRoles} user(s). Unassign it from those users before deleting.`
            : `Are you sure you want to delete "${confirmRole?.name}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={del.isPending}
      />
    </>
  );
}
