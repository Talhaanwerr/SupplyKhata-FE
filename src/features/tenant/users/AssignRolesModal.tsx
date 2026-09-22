"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usersApi } from "@/lib/users-api";
import { rolesApi } from "@/lib/roles-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { USERS_QUERY_KEY, ROLES_QUERY_KEY } from "@/constants/query-keys";
import type { UserListItem } from "@/types/users";

interface AssignRolesModalProps {
  user: UserListItem | null;
  open: boolean;
  onClose: () => void;
}

export function AssignRolesModal({ user, open, onClose }: AssignRolesModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Track original role IDs to detect role removals
  const [originalRoleIds, setOriginalRoleIds] = useState<Set<string>>(new Set());

  const { data: rolesRes, isLoading: loadingRoles } = useQuery({
    queryKey: [ROLES_QUERY_KEY, "assign-modal"],
    queryFn: () => rolesApi.list({ page: 1, limit: 100 }),
    enabled: open,
    staleTime: 60_000,
  });

  const allRoles = rolesRes?.data?.items ?? [];

  // Pre-select roles the user currently has
  useEffect(() => {
    if (!user || !open) return;
    usersApi
      .getOne(user.id)
      .then((res) => {
        const roleIds = res.data?.roles.map((r) => r.id) ?? [];
        setSelected(new Set(roleIds));
        setOriginalRoleIds(new Set(roleIds));
      })
      .catch(() => {
        setSelected(new Set());
        setOriginalRoleIds(new Set());
      });
  }, [user, open]);

  const assign = useApiMutation(
    (roleIds: string[]) => usersApi.assignRoles(user!.id, { roleIds }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        toast({ title: "Roles updated", variant: "success" });
        onClose();
      },
      onError: (err) => {
        setErrorMsg(getSafeErrorMessage(err));
      },
    }
  );

  function toggleRole(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Determine if any previously-held roles are being removed
  const removedCount = [...originalRoleIds].filter((id) => !selected.has(id)).length;

  function handleSave() {
    setErrorMsg("");
    // If roles are being removed, require explicit confirmation
    if (removedCount > 0) {
      setConfirmOpen(true);
    } else {
      assign.mutate([...selected]);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Roles</DialogTitle>
            <DialogDescription>
              Select roles for{" "}
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>
              . Saving replaces all existing role assignments.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="max-h-60 space-y-2 overflow-y-auto py-1">
            {loadingRoles ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : allRoles.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-sm text-slate-400">
                <ShieldCheck className="mb-2 h-8 w-8" />
                No roles available
              </div>
            ) : (
              allRoles
                .filter((role) => role.slug !== "super_admin")
                .map((role) => (
                  <button
                    type="button"
                    key={role.id}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50"
                    onClick={() => toggleRole(role.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-slate-400">{role.description}</p>
                      )}
                    </div>
                    <Checkbox
                      checked={selected.has(role.id)}
                      onChange={() => toggleRole(role.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={assign.isPending}>
              {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          assign.mutate([...selected]);
        }}
        title="Remove Role Access?"
        description={`This will remove ${removedCount} role${removedCount > 1 ? "s" : ""} from ${user?.firstName} ${user?.lastName}. They will immediately lose those permissions.`}
        confirmLabel="Yes, update roles"
        variant="destructive"
        isLoading={assign.isPending}
      />
    </>
  );
}
