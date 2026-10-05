"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { bomApi } from "@/lib/bom-api";
import { rawMaterialsApi } from "@/lib/raw-materials-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { PERMISSIONS } from "@/constants/permissions";
import {
  BOM_QUERY_KEY,
  PRODUCT_BOM_QUERY_KEY,
  RAW_MATERIALS_QUERY_KEY,
} from "@/constants/query-keys";
import type { BomDetail } from "@/types/bom";

type LineDraft = {
  key: string;
  rawMaterialId: string;
  qtyPerOutputUnit: string;
};

function newLine(): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    rawMaterialId: "",
    qtyPerOutputUnit: "1",
  };
}

export function BomEditor({
  productId,
  productName,
  bom,
}: {
  productId: string;
  productName?: string;
  bom: BomDetail | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(bom?.name ?? "");
  const [notes, setNotes] = useState(bom?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    bom?.lines?.length
      ? bom.lines.map((l) => ({
          key: l.id,
          rawMaterialId: l.rawMaterialId,
          qtyPerOutputUnit: String(l.qtyPerOutputUnit),
        }))
      : [newLine()]
  );
  const [rootError, setRootError] = useState("");
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const rawQuery = useQuery({
    queryKey: [RAW_MATERIALS_QUERY_KEY, "bom-editor"],
    queryFn: () => rawMaterialsApi.list({ isActive: true, limit: 100 }),
  });
  const rawMaterials = rawQuery.data?.data?.items ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [BOM_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [PRODUCT_BOM_QUERY_KEY, productId] });
  };

  const save = useApiMutation(
    async () => {
      const payloadLines = lines.map((l) => {
        if (!l.rawMaterialId) throw new Error("Select a raw material for each line");
        const qty = Number(l.qtyPerOutputUnit);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("Qty per unit must be > 0");
        return { rawMaterialId: l.rawMaterialId, qtyPerOutputUnit: qty };
      });
      if (payloadLines.length < 1) throw new Error("At least one line required");

      if (bom) {
        return bomApi.update(bom.id, {
          name: name.trim() || null,
          notes: notes.trim() || null,
          isActive: true,
          lines: payloadLines,
        });
      }
      return bomApi.create({
        productId,
        name: name.trim() || null,
        notes: notes.trim() || null,
        isActive: true,
        lines: payloadLines,
      });
    },
    {
      onSuccess: () => {
        invalidate();
        toast({
          title: bom ? "Recipe updated" : "Recipe created",
          variant: "success",
        });
      },
      onError: (err) => setRootError(getSafeErrorMessage(err)),
    }
  );

  const deactivate = useApiMutation(() => bomApi.deactivate(bom!.id), {
    onSuccess: () => {
      invalidate();
      setDeactivateOpen(false);
      toast({ title: "Recipe deactivated", variant: "success" });
    },
    onError: (err) =>
      toast({
        title: "Could not deactivate",
        description: getSafeErrorMessage(err),
        variant: "error",
      }),
  });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {bom ? `Active recipe · v${bom.version}` : "New recipe"}
            {productName ? ` — ${productName}` : ""}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Raw materials required per 1 finished output unit.
          </p>
        </div>
        {bom?.isActive && (
          <PermissionGuard permission={PERMISSIONS.BOM.UPDATE}>
            <Button variant="outline" size="sm" onClick={() => setDeactivateOpen(true)}>
              Deactivate
            </Button>
          </PermissionGuard>
        )}
      </div>

      {rootError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rootError}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional recipe name"
          />
        </FormField>
        <FormField label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </FormField>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">Lines</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((p) => [...p, newLine()])}
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        </div>
        {lines.map((line, idx) => (
          <div
            key={line.key}
            className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_120px_40px]"
          >
            <Select
              value={line.rawMaterialId}
              onChange={(e) =>
                setLines((prev) =>
                  prev.map((l, i) => (i === idx ? { ...l, rawMaterialId: e.target.value } : l))
                )
              }
            >
              <option value="">Raw material…</option>
              {rawMaterials.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} ({rm.unit})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="Qty / unit"
              value={line.qtyPerOutputUnit}
              onChange={(e) =>
                setLines((prev) =>
                  prev.map((l, i) => (i === idx ? { ...l, qtyPerOutputUnit: e.target.value } : l))
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={lines.length <= 1}
              onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <PermissionGuard permission={bom ? PERMISSIONS.BOM.UPDATE : PERMISSIONS.BOM.CREATE}>
          <Button
            disabled={save.isPending}
            onClick={async () => {
              setRootError("");
              try {
                await save.mutateAsync();
              } catch (err) {
                if (err instanceof Error) setRootError(err.message);
              }
            }}
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {bom ? "Save recipe" : "Create recipe"}
          </Button>
        </PermissionGuard>
      </div>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={() => deactivate.mutate()}
        title="Deactivate recipe"
        description="This BOM will no longer be used for new production. Past snapshots stay on completed orders later."
        confirmLabel="Deactivate"
        isLoading={deactivate.isPending}
      />
    </div>
  );
}
