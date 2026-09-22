import { cn } from "@/lib/utils";

type StatusVariant =
  | "active"
  | "inactive"
  | "pending"
  | "suspended"
  | "cancelled"
  | "trial"
  | "invited"
  | "success"
  | "warning"
  | "error"
  | "default";

const VARIANT_STYLES: Record<StatusVariant, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  invited: "bg-purple-50 text-purple-700 border-purple-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  error: "bg-red-50 text-red-700 border-red-200",
  default: "bg-slate-100 text-slate-600 border-slate-200",
};

function inferVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (s in VARIANT_STYLES) return s as StatusVariant;
  if (s === "past_due") return "error";
  if (s === "expired") return "cancelled";
  return "default";
}

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const v = variant ?? inferVariant(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        VARIANT_STYLES[v],
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </span>
  );
}
