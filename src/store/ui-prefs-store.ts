"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_PAGE_SIZE = 3;
const MAX_PAGE_SIZE = 20;
const DEFAULT_PAGE_SIZE = 10;

function clampPageSize(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(n)));
}

interface UiPrefsState {
  pageSize: number;
  setPageSize: (n: number) => void;
}

/** Persisted UI prefs (localStorage). Used by all tables for page size. */
export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      pageSize: DEFAULT_PAGE_SIZE,
      setPageSize: (n) => set({ pageSize: clampPageSize(n) }),
    }),
    { name: "ui-prefs" }
  )
);

export { MIN_PAGE_SIZE, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, clampPageSize };
