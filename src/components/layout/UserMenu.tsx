"use client";

import Link from "next/link";
import { LogOut, UserCircle, Settings, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
import { resolveAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu({ className }: { className?: string }) {
  const { user, logout } = useAuthStore();
  const profileHref = user?.isSuperAdmin ? "/super-admin/profile" : "/profile";
  const settingsHref = user?.isSuperAdmin ? "/super-admin/settings" : "/settings";

  const displayName = user?.name ?? "User";
  const email = user?.email ?? "";
  const initials = getInitials(displayName);
  const avatarSrc = resolveAssetUrl(user?.avatarUrl);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-100 focus-visible:outline-none",
          className
        )}
      >
        <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt="" className="h-8 w-8 object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="hidden flex-col items-start sm:flex">
          <span className="max-w-[120px] truncate text-sm font-medium text-slate-900">
            {displayName}
          </span>
          <span className="max-w-[120px] truncate text-xs text-slate-400">{email}</span>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate font-medium text-slate-900">{displayName}</span>
            <span className="truncate text-xs text-slate-400">{email}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={profileHref} className="cursor-pointer">
            <UserCircle className="h-4 w-4" />
            My Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={settingsHref} className="cursor-pointer">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
