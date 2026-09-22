import type { WorkspaceTenant } from "@/types";

const STORAGE_KEY = "saas.pendingWorkspaceSelection";

export type PendingWorkspaceSelection = {
  selectionToken: string;
  tenants: WorkspaceTenant[];
};

export function savePendingWorkspaceSelection(data: PendingWorkspaceSelection): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPendingWorkspaceSelection(): PendingWorkspaceSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingWorkspaceSelection;
    if (!parsed?.selectionToken || !Array.isArray(parsed.tenants)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingWorkspaceSelection(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
