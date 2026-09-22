"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, ShieldCheck, UserX, UserCheck, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { usersApi } from "@/lib/users-api";
import { useUserStatusMutation } from "@/hooks/use-user-status-mutation";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { EditUserModal } from "./EditUserModal";
import { AssignRolesModal } from "./AssignRolesModal";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { USERS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { UserListItem } from "@/types/users";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "INVITED", label: "Invited" },
];

export function TenantUsersTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [assignUser, setAssignUser] = useState<UserListItem | null>(null);
  const [confirmUser, setConfirmUser] = useState<{
    user: UserListItem;
    action: "deactivate" | "reactivate";
  } | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const { toast } = useToast();
  const qc = useQueryClient();

  const removeMember = useApiMutation((id: string) => usersApi.removeMember(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      setDeleteUser(null);
      toast({ title: "User removed from workspace", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not remove user",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteUser(null);
    },
  });

  const { data: res, isLoading } = useQuery({
    queryKey: [USERS_QUERY_KEY, page, search, status, pageSize],
    queryFn: () =>
      usersApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
        status: status || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const payload = res?.data;
  const users = payload?.items ?? [];
  const totalPages = payload?.meta.totalPages ?? 1;

  const { deactivate, reactivate, isActing } = useUserStatusMutation(confirmUser?.user.id, {
    onSettled: () => setConfirmUser(null),
  });

  const columns: Column<UserListItem>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">
            {r.firstName} {r.lastName}
          </p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (r) => {
        const roles = r.roles ?? [];
        if (roles.length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <span
                key={role.id}
                className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {role.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "verified",
      header: "Verified",
      render: (r) =>
        r.emailVerified ? (
          <span className="text-xs font-medium text-green-600">✓ Yes</span>
        ) : (
          <span className="text-xs text-slate-400">Pending</span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (r) => (
        <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32 text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          {/* View */}
          <button
            onClick={() => setViewUser(r.id)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>

          <PermissionGuard permission={PERMISSIONS.USERS.UPDATE}>
            {/* Edit */}
            <button
              onClick={() => setEditUser(r)}
              className="hover:text-primary rounded p-1.5 text-slate-400 hover:bg-slate-100"
              title="Edit user"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {/* Assign roles */}
            <button
              onClick={() => setAssignUser(r)}
              className="hover:text-primary rounded p-1.5 text-slate-400 hover:bg-slate-100"
              title="Assign roles"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>

            {/* Deactivate / Reactivate */}
            {r.status === "ACTIVE" ? (
              <button
                onClick={() => setConfirmUser({ user: r, action: "deactivate" })}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                title="Deactivate"
              >
                <UserX className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmUser({ user: r, action: "reactivate" })}
                className="rounded p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600"
                title="Reactivate"
              >
                <UserCheck className="h-4 w-4" />
              </button>
            )}
          </PermissionGuard>

          {/* Remove from workspace */}
          <PermissionGuard permission={PERMISSIONS.USERS.DELETE}>
            <button
              onClick={() => setDeleteUser(r)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
              title="Remove from workspace"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          className="sm:max-w-xs"
          placeholder="Search by name or email…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            illustration="users"
            title="No users found"
            description="Invite your first team member to get started."
          />
        }
      />

      {/* Modals */}
      <EditUserModal user={editUser} open={!!editUser} onClose={() => setEditUser(null)} />

      <AssignRolesModal user={assignUser} open={!!assignUser} onClose={() => setAssignUser(null)} />

      <UserDetailDrawer
        userId={viewUser}
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        onEdit={(u) => {
          setViewUser(null);
          setEditUser(u);
        }}
        onAssignRoles={(u) => {
          setViewUser(null);
          setAssignUser(u);
        }}
      />

      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={() =>
          confirmUser?.action === "deactivate" ? deactivate.mutate() : reactivate.mutate()
        }
        title={confirmUser?.action === "deactivate" ? "Deactivate User" : "Reactivate User"}
        description={
          confirmUser?.action === "deactivate"
            ? `This will prevent ${confirmUser.user.email} from logging in.`
            : `This will restore ${confirmUser?.user.email}'s access.`
        }
        confirmLabel={confirmUser?.action === "deactivate" ? "Deactivate" : "Reactivate"}
        variant={confirmUser?.action === "deactivate" ? "destructive" : "default"}
        isLoading={isActing}
      />

      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => removeMember.mutate(deleteUser!.id)}
        title="Remove User"
        description={`This will remove ${deleteUser?.email} from this workspace. They will lose all roles and access. This does not delete their account — they can be re-invited later.`}
        confirmLabel="Remove"
        variant="destructive"
        isLoading={removeMember.isPending}
      />
    </>
  );
}
