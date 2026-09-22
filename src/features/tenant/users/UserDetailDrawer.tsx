"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Clock, ShieldCheck, UserCheck, UserX, Pencil, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usersApi } from "@/lib/users-api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { USER_DETAIL_QUERY_KEY } from "@/constants/query-keys";
import { useUserStatusMutation } from "@/hooks/use-user-status-mutation";
import { useState } from "react";
import type { UserDetail, UserListItem } from "@/types/users";

interface UserDetailDrawerProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (user: UserListItem) => void;
  onAssignRoles: (user: UserListItem) => void;
}

export function UserDetailDrawer({
  userId,
  open,
  onClose,
  onEdit,
  onAssignRoles,
}: UserDetailDrawerProps) {
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "reactivate" | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: [USER_DETAIL_QUERY_KEY, userId],
    queryFn: () => usersApi.getOne(userId!),
    enabled: !!userId && open,
  });

  const user: UserDetail | null | undefined = res?.data;

  const { deactivate, reactivate, isActing } = useUserStatusMutation(userId, {
    onSettled: () => setConfirmAction(null),
  });

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>User Detail</SheetTitle>
            <SheetDescription>View and manage this user</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !user ? (
            <p className="mt-8 text-center text-sm text-slate-400">User not found.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold">
                  {resolveAssetUrl(user.avatarUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveAssetUrl(user.avatarUrl)}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <>
                      {(user.firstName[0] ?? "").toUpperCase()}
                      {(user.lastName[0] ?? "").toUpperCase()}
                    </>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <StatusBadge status={user.status} />
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow
                  icon={UserCheck}
                  label="Email verified"
                  value={user.emailVerified ? "Yes" : "Not verified"}
                />
                <InfoRow icon={Clock} label="Timezone" value={user.timezone ?? "UTC"} />
                <InfoRow
                  icon={Clock}
                  label="Joined"
                  value={new Date(user.createdAt).toLocaleDateString()}
                />
              </div>

              {/* Roles */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ShieldCheck className="h-4 w-4" /> Roles
                  </h3>
                  <button
                    onClick={() => onAssignRoles(user as UserListItem)}
                    className="text-primary text-xs hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.length > 0 ? (
                    user.roles.map((r) => (
                      <span
                        key={r.id}
                        className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(user as UserListItem)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {user.status === "ACTIVE" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmAction("deactivate")}
                  >
                    <UserX className="h-3.5 w-3.5 text-red-500" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmAction("reactivate")}
                  >
                    <Users className="h-3.5 w-3.5 text-green-600" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmAction === "deactivate"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => deactivate.mutate(undefined)}
        title="Deactivate User"
        description="This will prevent the user from logging in."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={isActing}
      />
      <ConfirmDialog
        open={confirmAction === "reactivate"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => reactivate.mutate(undefined)}
        title="Reactivate User"
        description="This will restore the user's access to the workspace."
        confirmLabel="Reactivate"
        isLoading={isActing}
      />
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
