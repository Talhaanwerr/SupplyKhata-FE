/**
 * Reusable UI primitives — import from here or from individual files.
 *
 * Prompt 12 checklist:
 * - DataTable (generic, server pagination)
 * - SearchInput, DateRangePicker
 * - ConfirmDialog, FormModal
 * - EmptyState, ErrorState, LoadingSkeleton
 * - StatusBadge, FileUploader
 * - PageHeader, StatCard, FormField
 * - Breadcrumbs (layout/)
 */

export { DataTable, type Column, type DataTableProps } from "./data-table";
export { SearchInput } from "./search-input";
export { DateRangePicker, type DateRange } from "./date-range-picker";
export { ConfirmDialog } from "./confirm-dialog";
export { FormModal } from "./form-modal";
export { EmptyState } from "./empty-state";
export { ErrorState } from "./error-state";
export { LoadingSkeleton } from "./loading-skeleton";
export { StatusBadge } from "./status-badge";
export { FileUploader } from "./file-uploader";
export { PageHeader } from "./page-header";
export { StatCard } from "./stat-card";
export { FormField } from "./form-field";
export { Button } from "./button";
export { Input } from "./input";
export { Select } from "./select";
export { Checkbox } from "./checkbox";
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
export { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";
export { ToastProvider, useToast } from "./toast";
