"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { rolesApi } from "@/lib/roles-api";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { usePermissionAny } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLES_QUERY_KEY, PERMISSIONS_QUERY_KEY } from "@/constants/query-keys";
import type { RoleItem, PermissionItem } from "@/types/roles";

export function PermissionsMatrix() {
  const qc = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  /** Local edits for the current role; null = use server permissions. */
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [draftRoleId, setDraftRoleId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canEdit = usePermissionAny([PERMISSIONS.ROLES.UPDATE, PERMISSIONS.ROLES.MANAGE]);

  const { data: rolesRes, isLoading: loadingRoles } = useQuery({
    queryKey: [ROLES_QUERY_KEY, "matrix"],
    queryFn: () => rolesApi.list({ page: 1, limit: 100 }),
  });

  const { data: permsRes, isLoading: loadingPerms } = useQuery({
    queryKey: [PERMISSIONS_QUERY_KEY],
    queryFn: rolesApi.listPermissions,
    staleTime: Infinity,
  });

  const roles: RoleItem[] = rolesRes?.data?.items ?? [];
  const allPermissions = useMemo(() => permsRes?.data ?? [], [permsRes]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const editable = canEdit && !!selectedRole && !selectedRole.isSystem;

  const baselineIds = useMemo(
    () => new Set(selectedRole?.permissions.map((p) => p.id) ?? []),
    [selectedRole]
  );

  const selectedIds = useMemo(() => {
    if (draftRoleId === selectedRoleId && draftIds) {
      return new Set(draftIds);
    }
    return new Set(baselineIds);
  }, [draftRoleId, selectedRoleId, draftIds, baselineIds]);

  const grantedSlugs = useMemo(() => {
    const byId = new Map(allPermissions.map((p) => [p.id, p.slug]));
    const slugs = new Set<string>();
    for (const id of selectedIds) {
      const slug = byId.get(id);
      if (slug) slugs.add(slug);
    }
    return slugs;
  }, [selectedIds, allPermissions]);

  const isDirty = useMemo(() => {
    if (selectedIds.size !== baselineIds.size) return true;
    for (const id of selectedIds) {
      if (!baselineIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, baselineIds]);

  const byModule = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of allPermissions) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [allPermissions]);

  const allActions = useMemo(() => {
    const acts = new Set<string>();
    allPermissions.forEach((p) => acts.add(p.action));
    return [...acts];
  }, [allPermissions]);

  function selectRole(id: string) {
    setSelectedRoleId(id);
    setDraftIds(null);
    setDraftRoleId(null);
    setErrorMsg("");
  }

  function setSelectedIds(next: Set<string>) {
    setDraftRoleId(selectedRoleId);
    setDraftIds([...next]);
  }

  const save = useApiMutation(
    (permissionIds: string[]) => {
      const visible = new Set(allPermissions.map((p) => p.id));
      const filtered = permissionIds.filter((id) => visible.has(id));
      return rolesApi.assignPermissions(selectedRole!.id, { permissionIds: filtered });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
        setDraftIds(null);
        setDraftRoleId(null);
        setErrorMsg("");
      },
      onError: (err) => setErrorMsg(err.message),
    }
  );

  function togglePerm(perm: PermissionItem) {
    if (!editable) return;
    const next = new Set(selectedIds);
    if (next.has(perm.id)) next.delete(perm.id);
    else next.add(perm.id);
    setSelectedIds(next);
  }

  const isLoading = loadingRoles || loadingPerms;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="text-sm font-medium text-slate-700">Permissions for:</label>
        <Select
          value={selectedRoleId}
          onChange={(e) => selectRole(e.target.value)}
          disabled={isLoading}
          className="sm:max-w-xs"
        >
          <option value="">— Select a role —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        {selectedRole?.isSystem && (
          <span className="text-xs font-medium text-amber-600">System role (read-only)</span>
        )}
        {editable && (
          <span className="text-xs text-slate-500">Click cells to grant or revoke, then save.</span>
        )}
        {editable && (
          <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={!isDirty || save.isPending}
              onClick={() => {
                setDraftIds(null);
                setDraftRoleId(null);
              }}
            >
              Reset
            </Button>
            <Button
              size="sm"
              disabled={!isDirty || save.isPending}
              onClick={() => save.mutate([...selectedIds])}
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Permissions
            </Button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !selectedRoleId ? (
          <EmptyState
            icon={ShieldCheck}
            title="Select a role to view permissions"
            description="Choose a role from the dropdown above to see and edit its permission matrix."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Module
                  </th>
                  {allActions.map((a) => (
                    <th
                      key={a}
                      className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase"
                    >
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...byModule.entries()].map(([module, perms]) => (
                  <tr key={module} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-800 capitalize">
                      {module.replace(/-/g, " ")}
                    </td>
                    {allActions.map((action) => {
                      const slug = `${module}:${action}`;
                      const perm = perms.find((p) => p.slug === slug);
                      if (!perm) {
                        return (
                          <td key={action} className="px-4 py-3 text-center text-slate-200">
                            —
                          </td>
                        );
                      }
                      const granted = grantedSlugs.has(slug);
                      return (
                        <td key={action} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={!editable || save.isPending}
                            onClick={() => togglePerm(perm)}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                              granted
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-400"
                            } ${
                              editable
                                ? "hover:ring-primary/30 cursor-pointer hover:ring-2"
                                : "cursor-default"
                            }`}
                            title={`${slug}: ${granted ? "Granted" : "Denied"}${
                              editable ? " (click to toggle)" : ""
                            }`}
                            aria-pressed={granted}
                          >
                            {granted ? "✓" : "✗"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
