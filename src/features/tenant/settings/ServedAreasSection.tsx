"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/constants/permissions";
import { AREAS_QUERY_KEY } from "@/constants/query-keys";
import { areasApi } from "@/lib/areas-api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { getSafeErrorMessage } from "@/lib/safe-error";
import type { ApiError } from "@/lib/api-error";
import type { Area } from "@/types/areas";

export function ServedAreasSection() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [editing, setEditing] = useState<Area | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);

  const {
    data: res,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [AREAS_QUERY_KEY, { includeInactive: true }],
    queryFn: () => areasApi.list({ includeInactive: true }),
  });

  const areas = res?.data ?? [];

  const create = useApiMutation(areasApi.create, {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      setNameInput("");
      setNameError("");
      toast({ title: "Area added", variant: "success" });
    },
    onError: (err: ApiError) => {
      toast({
        title: "Could not add area",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  const update = useApiMutation(
    ({ id, ...payload }: { id: string; name?: string; isActive?: boolean }) =>
      areasApi.update(id, payload),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
        setEditing(null);
        setEditName("");
        toast({ title: "Area updated", variant: "success" });
      },
      onError: (err: ApiError) => {
        toast({
          title: "Could not update area",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  const remove = useApiMutation((id: string) => areasApi.remove(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      setDeleteTarget(null);
      toast({ title: "Area deleted", variant: "success" });
    },
    onError: (err: ApiError) => {
      toast({
        title: "Could not delete area",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  function handleAdd() {
    const name = nameInput.trim();
    if (!name) {
      setNameError("Area name is required");
      return;
    }
    create.mutate({ name });
  }

  function startEdit(area: Area) {
    setEditing(area);
    setEditName(area.name);
  }

  function saveEdit() {
    if (!editing) return;
    const name = editName.trim();
    if (!name) {
      toast({ title: "Area name is required", variant: "error" });
      return;
    }
    update.mutate({ id: editing.id, name });
  }

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <LoadingSkeleton className="h-6 w-40" />
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-10 w-2/3" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load areas"
        description="We couldn't fetch served areas for this workspace."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-900">Served Areas</h2>
      <p className="mb-5 text-sm text-slate-500">
        Areas you deliver to. These appear in the customer area dropdown. New areas created while
        adding a customer will also show up here.
      </p>

      <PermissionGuard permission={PERMISSIONS.AREAS.CREATE}>
        <div className="mb-5 flex gap-2">
          <div className="min-w-0 flex-1">
            <FormField label="Add area" error={nameError}>
              <Input
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setNameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="e.g. Gulshan"
                maxLength={100}
              />
            </FormField>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleAdd} disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </div>
      </PermissionGuard>

      {areas.length === 0 ? (
        <EmptyState
          title="No areas yet"
          description="Add your first delivery area so you can assign it when creating customers."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {areas.map((area) => (
            <li key={area.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {editing?.id === area.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="max-w-xs"
                    autoFocus
                    maxLength={100}
                  />
                  <Button type="button" size="sm" onClick={saveEdit} disabled={update.isPending}>
                    {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(null)}
                    disabled={update.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                    {area.name}
                  </span>
                  <StatusBadge status={area.isActive ? "ACTIVE" : "INACTIVE"} />
                  <PermissionGuard permission={PERMISSIONS.AREAS.UPDATE}>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(area)}
                        aria-label={`Rename ${area.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => update.mutate({ id: area.id, isActive: !area.isActive })}
                        disabled={update.isPending}
                      >
                        {area.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </PermissionGuard>
                  <PermissionGuard permission={PERMISSIONS.AREAS.DELETE}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(area)}
                      aria-label={`Delete ${area.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </PermissionGuard>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
        title="Delete area"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? You can add it again later with the same name.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </div>
  );
}
