import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Inline SVG illustrations ─────────────────────────────────────────────────
// Simple, lightweight SVGs that match the slate colour palette.

function IllustrationUsers() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="60" cy="28" r="18" fill="#e2e8f0" />
      <circle cx="60" cy="28" r="11" fill="#cbd5e1" />
      <ellipse cx="60" cy="62" rx="26" ry="12" fill="#e2e8f0" />
      <circle cx="30" cy="34" r="13" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="30" cy="34" r="8" fill="#e2e8f0" />
      <ellipse cx="30" cy="60" rx="19" ry="9" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="90" cy="34" r="13" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="90" cy="34" r="8" fill="#e2e8f0" />
      <ellipse cx="90" cy="60" rx="19" ry="9" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
    </svg>
  );
}

function IllustrationRoles() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect
        x="20"
        y="15"
        width="80"
        height="50"
        rx="8"
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <path d="M60 35 L60 25" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="22" r="4" fill="#cbd5e1" />
      <path d="M60 35 L47 48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 35 L73 48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="47" cy="51" r="4" fill="#e2e8f0" />
      <circle cx="73" cy="51" r="4" fill="#e2e8f0" />
      <rect x="38" y="55" width="18" height="7" rx="2" fill="#e2e8f0" />
      <rect x="64" y="55" width="18" height="7" rx="2" fill="#e2e8f0" />
    </svg>
  );
}

function IllustrationLogs() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect
        x="15"
        y="10"
        width="90"
        height="60"
        rx="8"
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <line
        x1="28"
        y1="28"
        x2="92"
        y2="28"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="40"
        x2="75"
        y2="40"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="52"
        x2="85"
        y2="52"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="28" r="3" fill="#cbd5e1" />
      <circle cx="22" cy="40" r="3" fill="#cbd5e1" />
      <circle cx="22" cy="52" r="3" fill="#cbd5e1" />
    </svg>
  );
}

function IllustrationNotifications() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M60 15 C45 15 35 25 35 38 L35 52 L25 60 L95 60 L85 52 L85 38 C85 25 75 15 60 15Z"
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <rect x="52" y="60" width="16" height="6" rx="3" fill="#e2e8f0" />
      <circle cx="78" cy="22" r="7" fill="#fecaca" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function IllustrationFiles() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect
        x="30"
        y="12"
        width="45"
        height="56"
        rx="5"
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <path d="M60 12 L75 27 L60 27Z" fill="#e2e8f0" />
      <path d="M60 12 L60 27 L75 27" stroke="#e2e8f0" strokeWidth="2" />
      <line
        x1="42"
        y1="38"
        x2="63"
        y2="38"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="42"
        y1="47"
        x2="68"
        y2="47"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="42"
        y1="56"
        x2="57"
        y2="56"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="65" y="45" width="28" height="23" rx="4" fill="#e2e8f0" />
      <path d="M79 52 L79 61" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M75 57 L79 61 L83 57"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IllustrationGeneric() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect
        x="20"
        y="20"
        width="80"
        height="40"
        rx="8"
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <circle cx="60" cy="40" r="12" fill="#e2e8f0" />
      <path
        d="M55 40 L58 43 L65 36"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Illustration map ─────────────────────────────────────────────────────────

const ILLUSTRATIONS = {
  users: IllustrationUsers,
  roles: IllustrationRoles,
  logs: IllustrationLogs,
  notifications: IllustrationNotifications,
  files: IllustrationFiles,
  generic: IllustrationGeneric,
} as const;

export type EmptyStateIllustration = keyof typeof ILLUSTRATIONS;

// ─── Component ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Themed SVG illustration instead of a plain icon */
  illustration?: EmptyStateIllustration;
  /** Fallback plain Lucide icon (used when illustration is not set) */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  illustration,
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Illustration = illustration ? ILLUSTRATIONS[illustration] : null;

  return (
    <div className={cn("flex flex-col items-center justify-center py-14 text-center", className)}>
      {Illustration ? (
        <div className="mb-5 w-32">
          <Illustration />
        </div>
      ) : Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
      ) : null}

      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
