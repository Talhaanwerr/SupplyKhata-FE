"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { productionApi } from "@/lib/production-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import type { ProductionOrderDetail } from "@/types/production";

function CompleteProductionForm({
  order,
  onClose,
  onSuccess,
}: {
  order: ProductionOrderDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [actualQty, setActualQty] = useState(String(order.plannedQty));
  const [scrapQty, setScrapQty] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const [scrapReason, setScrapReason] = useState("");

  const actual = Number(actualQty);
  const needsVariance = Number.isFinite(actual) && actual > 0 && actual !== order.plannedQty;

  const mutation = useApiMutation(
    () =>
      productionApi.complete(order.id, {
        actualQty: Number(actualQty),
        scrapQty: scrapQty === "" ? null : Number(scrapQty),
        varianceNote: varianceNote.trim() || null,
        scrapReason: scrapReason.trim() || null,
      }),
    {
      onSuccess: () => {
        toast({ title: "Production completed", variant: "success" });
        onSuccess();
        onClose();
      },
      onError: (err) =>
        toast({
          title: "Could not complete",
          description: getSafeErrorMessage(err),
          variant: "error",
        }),
    }
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Complete production</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Planned: <strong>{order.plannedQty}</strong>. Raw consume uses actual qty × BOM.
        </p>
        <FormField label="Actual qty" required>
          <Input
            type="number"
            step="any"
            min="0.001"
            value={actualQty}
            onChange={(e) => setActualQty(e.target.value)}
          />
        </FormField>
        {needsVariance && (
          <FormField label="Variance note" required>
            <Input
              value={varianceNote}
              onChange={(e) => setVarianceNote(e.target.value)}
              placeholder="Why actual differs from planned"
            />
          </FormField>
        )}
        <FormField label="Scrap qty (finished wastage)">
          <Input
            type="number"
            step="any"
            min="0"
            value={scrapQty}
            onChange={(e) => setScrapQty(e.target.value)}
          />
        </FormField>
        <FormField label="Scrap reason">
          <Input
            value={scrapReason}
            onChange={(e) => setScrapReason(e.target.value)}
            placeholder="Optional"
          />
        </FormField>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={mutation.isPending || (needsVariance && !varianceNote.trim())}
          onClick={() => mutation.mutate()}
        >
          Complete
        </Button>
      </DialogFooter>
    </>
  );
}

export function CompleteProductionModal({
  open,
  onClose,
  order,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  order: ProductionOrderDetail;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {open ? (
          <CompleteProductionForm
            key={order.id}
            order={order}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
