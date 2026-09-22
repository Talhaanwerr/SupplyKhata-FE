"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { notificationsApi } from "@/lib/notifications-api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { NOTIFICATIONS_QUERY_KEY, NOTIFICATIONS_UNREAD_COUNT_KEY } from "@/constants/query-keys";
import type { NotificationItem, NotificationType } from "@/types/notifications";

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  INFO: "text-blue-500",
  SUCCESS: "text-green-500",
  WARNING: "text-amber-500",
  ERROR: "text-red-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Normalize notification deep-links to valid app routes (or null = no navigation). */
function resolveNotificationHref(link: string | null | undefined): string | null {
  if (!link?.trim()) return null;
  const raw = link.trim();

  // Absolute URLs — open as-is
  if (/^https?:\/\//i.test(raw)) return raw;

  const href = raw.startsWith("/") ? raw : `/${raw}`;

  // Known tenant app routes (keep this list in sync with TenantSidebar)
  const allowed = new Set([
    "/users",
    "/roles",
    "/permissions",
    "/settings",
    "/activity-logs",
    "/profile",
    "/reports",
    "/dashboard",
  ]);

  // Allow nested paths under known sections (e.g. /users/abc)
  const base = "/" + href.split("/").filter(Boolean)[0];
  if (!allowed.has(base) && !allowed.has(href)) {
    return null;
  }

  return href;
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Only poll when the user is a tenant user (notifications require TenantGuard).
  const isTenantUser = Boolean(user && !user.isSuperAdmin && user.tenantId);

  const { data: countRes } = useQuery({
    queryKey: [NOTIFICATIONS_UNREAD_COUNT_KEY],
    queryFn: notificationsApi.unreadCount,
    enabled: isTenantUser,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, { limit: 10 }],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    enabled: isTenantUser && open,
    staleTime: 15_000,
  });

  const unread = countRes?.data?.count ?? 0;
  const notifications: NotificationItem[] = listRes?.data?.items ?? [];

  const markOne = useApiMutation((id: string) => notificationsApi.markAsRead(id), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_UNREAD_COUNT_KEY] });
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
  });

  const markAll = useApiMutation((_?: void) => notificationsApi.markAllAsRead(), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_UNREAD_COUNT_KEY] });
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!isTenantUser) return null;

  const hasUnread = unread > 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={hasUnread ? `${unread} unread notifications` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {hasUnread && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {listLoading && (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!listLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            )}

            {!listLoading &&
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type];
                const iconColor = TYPE_COLOR[n.type];
                const href = resolveNotificationHref(n.link);
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors",
                      !n.isRead ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {href && <ExternalLink className="h-3.5 w-3.5 text-slate-300" />}
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markOne.mutate(n.id);
                          }}
                          className="h-2 w-2 rounded-full bg-blue-500 transition-colors hover:bg-blue-700"
                          aria-label="Mark as read"
                        />
                      )}
                    </div>
                  </div>
                );

                if (!href) {
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className="block w-full text-left"
                      onClick={() => {
                        if (!n.isRead) markOne.mutate(n.id);
                      }}
                    >
                      {content}
                    </button>
                  );
                }

                const isExternal = /^https?:\/\//i.test(href);
                if (isExternal) {
                  return (
                    <a
                      key={n.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        markOne.mutate(n.id);
                        setOpen(false);
                      }}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => {
                      markOne.mutate(n.id);
                      setOpen(false);
                    }}
                  >
                    {content}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
