"use client";

import { useState } from "react";
import { Building2, ChevronsUpDown, Check, Loader2 } from "lucide-react";
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
import type { WorkspaceTenant } from "@/types";

export function TenantSwitcher() {
  const { activeTenant, userTenants, switchTenant } = useAuthStore();
  const [switching, setSwitching] = useState<string | null>(null);
  const logoSrc = resolveAssetUrl(activeTenant?.logoUrl);

  async function handleSwitch(tenant: WorkspaceTenant) {
    if (tenant.id === activeTenant?.id || switching) return;
    setSwitching(tenant.id);
    try {
      await switchTenant(tenant.id);
      // switchTenant does window.location.reload() on success; if it reaches here, reset
    } catch {
      setSwitching(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-100 focus-visible:outline-none">
        <div className="bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="h-6 w-6 object-cover" />
          ) : (
            <Building2 className="text-primary h-3.5 w-3.5" />
          )}
        </div>
        <span className="flex-1 truncate text-left font-medium text-slate-900">
          {activeTenant?.name ?? "Workspace"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {userTenants.length > 0 ? (
          userTenants.map((tenant) => {
            const isActive = tenant.id === activeTenant?.id;
            const isSwitching = switching === tenant.id;
            return (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => handleSwitch(tenant)}
                disabled={!!switching || isActive}
                className={cn("cursor-pointer", isActive && "opacity-100")}
              >
                <Building2
                  className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-slate-400")}
                />
                <span className="flex-1 truncate">{tenant.name}</span>
                {isSwitching ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
                ) : isActive ? (
                  <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            );
          })
        ) : (
          <DropdownMenuItem disabled className="text-slate-400">
            No other workspaces
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
