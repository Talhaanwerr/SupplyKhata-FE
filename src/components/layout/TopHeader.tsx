"use client";

import { Menu } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSidebar } from "./sidebar-context";

export function TopHeader() {
  const { toggle } = useSidebar();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Left: hamburger (mobile) + breadcrumbs */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={toggle}
          aria-label="Toggle navigation"
          className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs className="hidden sm:flex" />
      </div>

      {/* Right: language switcher + notifications + user menu */}
      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
