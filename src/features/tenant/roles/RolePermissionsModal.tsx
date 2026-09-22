"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { rolesApi } from "@/lib/roles-api";
import { ROLES_QUERY_KEY, PERMISSIONS_QUERY_KEY } from "@/constants/query-keys";
import type { RoleItem, PermissionItem } from "@/types/roles";

interface RolePermissionsModalProps {
  role: RoleItem | null;
  open: boolean;
  onClose: () => void;
}

export function RolePermissionsModal({ role, open, onClose }: RolePermissionsModalProps) {
  const qc = useQueryClient();
  const seedKey = `${role?.id ?? ""}:${open ? "1" : "0"}`;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissions.map((p) => p.id) ?? [])
  );
  const [prevSeedKey, setPrevSeedKey] = useState(seedKey);
  const [errorMsg, setErrorMsg] = useState("");

  // Re-seed selection when role/open changes (no effect — render-time sync)
  if (seedKey !== prevSeedKey) {
    setPrevSeedKey(seedKey);
    setSelected(new Set(role?.permissions.map((p) => p.id) ?? []));
    setErrorMsg("");
  }

  const { data: permsRes, isLoading } = useQuery({
    queryKey: [PERMISSIONS_QUERY_KEY],
    queryFn: rolesApi.listPermissions,
    staleTime: Infinity,
    enabled: open,
  });

  const allPermissions = useMemo(() => permsRes?.data ?? [], [permsRes]);

  // Group permissions by module
  const byModule = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of allPermissions) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [allPermissions]);

  const save = useApiMutation(
    (permissionIds: string[]) => {
      const visible = new Set(allPermissions.map((p) => p.id));
      const filtered = permissionIds.filter((id) => visible.has(id));
      return rolesApi.assignPermissions(role!.id, { permissionIds: filtered });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
        setErrorMsg("");
        onClose();
      },
      onError: (err) => setErrorMsg(err.message),
    }
  );

  function toggle(id: string) {
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

  function toggleModule(perms: PermissionItem[]) {
    const allChecked = perms.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        perms.forEach((p) => next.delete(p.id));
      } else {
        perms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions — {role?.name}</DialogTitle>
          <DialogDescription>
            Check/uncheck permissions per module. Saving replaces all current assignments.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-1 pr-1">
            {[...byModule.entries()].map(([module, perms]) => {
              const allChecked = perms.every((p) => selected.has(p.id));
              const someChecked = perms.some((p) => selected.has(p.id)) && !allChecked;

              return (
                <div key={module} className="rounded-xl border border-slate-200 p-4">
                  {/* Module header — select all toggle */}
                  <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Checkbox
                      checked={allChecked}
                      onChange={() => toggleModule(perms)}
                      className={someChecked ? "opacity-60" : ""}
                    />
                    <span className="text-sm font-semibold text-slate-800 capitalize">
                      {module.replace(/-/g, " ")}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {perms.filter((p) => selected.has(p.id)).length}/{perms.length}
                    </span>
                  </div>

                  {/* Per-permission checkboxes */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {perms.map((p) => (
                      <Checkbox
                        key={p.id}
                        label={p.action}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate([...selected])} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
