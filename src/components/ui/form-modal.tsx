"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Form id — submit button will target this form via the `form` attribute */
  formId?: string;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  /** When true, hides the default footer so the form can provide its own */
  hideFooter?: boolean;
  className?: string;
}

/**
 * Reusable modal shell for create/edit forms.
 * Pass a <form id={formId}> as children and the footer Submit triggers it.
 */
export function FormModal({
  open,
  onClose,
  title,
  description,
  children,
  formId,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitDisabled = false,
  hideFooter = false,
  className,
}: FormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={className ?? "max-w-md"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        {!hideFooter && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {cancelLabel}
            </Button>
            <Button type="submit" form={formId} disabled={isSubmitting || submitDisabled}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
