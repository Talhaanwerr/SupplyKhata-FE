"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { settingsApi } from "@/lib/settings-api";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { SETTINGS_QUERY_KEY, SIDEBAR_NAV_QUERY_KEY } from "@/constants/query-keys";
import { TENANT_NAV_ITEMS, type TenantNavKey } from "@/constants/tenant-nav";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SidebarNavSectionProps {
  /** Current more-keys from settings (empty = all primary). */
  moreKeys: string[];
}

function buildLists(moreKeys: string[]): { primary: TenantNavKey[]; more: TenantNavKey[] } {
  const moreSet = new Set(moreKeys);
  const primary: TenantNavKey[] = [];
  const more: TenantNavKey[] = [];
  for (const item of TENANT_NAV_ITEMS) {
    if (moreSet.has(item.key)) continue;
    primary.push(item.key);
  }
  for (const key of moreKeys) {
    if (TENANT_NAV_ITEMS.some((i) => i.key === key)) more.push(key as TenantNavKey);
  }
  return { primary, more };
}

function NavKeyList({
  side,
  keys,
  title,
  hint,
  selected,
  onSelect,
  label,
}: {
  side: "primary" | "more";
  keys: TenantNavKey[];
  title: string;
  hint: string;
  selected: { side: "primary" | "more"; key: TenantNavKey } | null;
  onSelect: (side: "primary" | "more", key: TenantNavKey) => void;
  label: (key: TenantNavKey) => string;
}) {
  return (
    <div className="flex min-h-[280px] flex-1 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {keys.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-slate-400">Empty</li>
        ) : (
          keys.map((key) => {
            const active = selected?.side === side && selected.key === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSelect(side, key)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {label(key)}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

export function SidebarNavSection({ moreKeys }: SidebarNavSectionProps) {
  const t = useTranslations("nav");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState(() => buildLists(moreKeys));
  const [selected, setSelected] = useState<{ side: "primary" | "more"; key: TenantNavKey } | null>(
    null
  );

  const label = (key: TenantNavKey) => t(key as Parameters<typeof t>[0]);

  const dirty = useMemo(() => {
    const a = draft.more.join(",");
    const b = moreKeys.join(",");
    return a !== b;
  }, [draft.more, moreKeys]);

  const save = useApiMutation(() => settingsApi.update({ sidebarNavMore: draft.more }), {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [SIDEBAR_NAV_QUERY_KEY] });
      toast({ title: "Sidebar layout saved", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not save sidebar",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  function moveToMore() {
    if (!selected || selected.side !== "primary") return;
    const key = selected.key;
    setDraft((prev) => ({
      primary: prev.primary.filter((k) => k !== key),
      more: [...prev.more, key],
    }));
    setSelected({ side: "more", key });
  }

  function moveToPrimary() {
    if (!selected || selected.side !== "more") return;
    const key = selected.key;
    setDraft((prev) => {
      const order = TENANT_NAV_ITEMS.map((i) => i.key);
      const nextPrimary = [...prev.primary, key].sort(
        (a, b) => order.indexOf(a) - order.indexOf(b)
      );
      return {
        primary: nextPrimary,
        more: prev.more.filter((k) => k !== key),
      };
    });
    setSelected({ side: "primary", key });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Sidebar layout</h3>
        <p className="mt-1 text-xs text-slate-500">
          Move rarely used tabs to More. Nothing is pre-set — leave More empty to keep every tab in
          the main list.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <NavKeyList
          side="primary"
          keys={draft.primary}
          title="Primary"
          hint="Always visible in the sidebar"
          selected={selected}
          onSelect={(side, key) => setSelected({ side, key })}
          label={label}
        />
        <div className="flex shrink-0 flex-row justify-center gap-2 sm:flex-col sm:justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selected || selected.side !== "primary"}
            onClick={moveToMore}
            aria-label="Move to More"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sm:hidden">To More</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selected || selected.side !== "more"}
            onClick={moveToPrimary}
            aria-label="Move to Primary"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sm:hidden">To Primary</span>
          </Button>
        </div>
        <NavKeyList
          side="more"
          keys={draft.more}
          title="More"
          hint="Collapsed group for setup / rare tabs"
          selected={selected}
          onSelect={(side, key) => setSelected({ side, key })}
          label={label}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutateAsync()}
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save sidebar layout
        </Button>
      </div>
    </div>
  );
}
