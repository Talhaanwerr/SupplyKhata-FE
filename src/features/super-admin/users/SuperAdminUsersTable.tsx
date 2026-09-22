"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Users } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { usersApi } from "@/lib/users-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { USERS_QUERY_KEY } from "@/constants/query-keys";
import { useUiPrefsStore } from "@/store/ui-prefs-store";
import type { UserListItem } from "@/types/users";

export function SuperAdminUsersTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null);
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: [USERS_QUERY_KEY, "platform", { search, page, pageSize }],
    queryFn: () =>
      usersApi.listPlatform({
        search: search || undefined,
        page,
        limit: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const remove = useApiMutation((id: string) => usersApi.deletePlatform(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY, "platform"] });
      setDeleteUser(null);
      toast({ title: "User deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete user",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
      setDeleteUser(null);
    },
  });

  const users = data?.data?.items ?? [];
  const totalPages = data?.data?.meta.totalPages ?? 1;

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
      key: "workspace",
      header: "Tenant / Role",
      render: (r) => {
        if (r.isSuperAdmin) {
          return <span className="text-primary text-xs font-semibold">SUPER ADMIN</span>;
        }

        if (!r.memberships?.length) {
          return <span className="text-xs text-slate-400">No tenant</span>;
        }

        return (
          <div className="space-y-2">
            {r.memberships.map((membership) => (
              <div key={membership.tenantId} className="text-xs">
                <p className="font-medium text-slate-800">
                  {membership.tenantName}{" "}
                  <span className="text-slate-400">/{membership.tenantSlug}</span>
                </p>
                <p className="text-slate-500">
                  {membership.roles.length
                    ? membership.roles.map((role) => role.name).join(", ")
                    : "No role assigned"}
                </p>
              </div>
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
      key: "createdAt",
      header: "Joined",
      render: (r) => (
        <span className="text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (r) =>
        r.isSuperAdmin ? null : (
          <button
            type="button"
            onClick={() => setDeleteUser(r)}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <SearchInput
        placeholder="Search users…"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={Users}
            title="No users found"
            description="Platform users will appear here once accounts exist."
          />
        }
      />

      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => remove.mutate(deleteUser!.id)}
        title="Delete User"
        description={
          deleteUser?.memberships?.length
            ? `Delete ${deleteUser.email}? They will be removed from all workspaces and can no longer sign in.`
            : `Delete ${deleteUser?.email}? This orphan account has no active tenant.`
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </div>
  );
}
