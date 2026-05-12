"use client";

import { useCallback, useEffect, useState } from "react";

import type { DiscoverFilters } from "@/lib/discover-engine";

/**
 * Shared discover-filter state hook.
 *
 * Backs the FiltersSheet on BOTH `/discover` and `/map` so the two
 * surfaces stay in sync. A filter selection on the deck propagates to
 * the markers on the world map and vice versa, both within a single
 * tab (in-memory listeners) and across page reloads (localStorage).
 *
 * Mirrors the {@link useShowOnMap} / {@link useDecisions} pattern:
 *   - SSR-safe: initial render returns {} (matches the server), then
 *     a mount effect rehydrates from localStorage.
 *   - Storage helpers (`read`, `write`) are colocated and exported via
 *     `loadFilters` / `saveFilters` so vitest can exercise them
 *     directly (this repo doesn't bundle @testing-library/react).
 *   - In-tab broadcast: each `setFilters(...)` call notifies every
 *     mounted consumer via an in-memory listener set so /discover and
 *     /map observe each other's writes live. Cross-tab is not in
 *     scope (no `storage` event subscription) — sub-plan 14 only
 *     needs same-tab sync.
 */

export const STORAGE_KEY = "ahavah.filters.v1";

type Listener = (value: DiscoverFilters) => void;
const listeners = new Set<Listener>();

/** Read the persisted filters from localStorage. Returns {} on SSR / corruption. */
export function loadFilters(): DiscoverFilters {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as DiscoverFilters;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Persist the filters AND broadcast to in-tab listeners. Tests can call
 * this directly without mounting a React tree to exercise the storage
 * + broadcast layer.
 */
export function saveFilters(next: DiscoverFilters): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private-mode — swallow, keep in-memory listeners firing */
    }
  }
  listeners.forEach((l) => l(next));
}

/** Remove the persisted filters (no broadcast — used by tests). */
export function clearFilters(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Subscribe to in-tab filter broadcasts. Returns an unsubscribe fn. */
export function subscribeFilters(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface UseFiltersResult {
  filters: DiscoverFilters;
  setFilters: (
    next: DiscoverFilters | ((prev: DiscoverFilters) => DiscoverFilters),
  ) => void;
  loaded: boolean;
}

export function useFilters(): UseFiltersResult {
  const [filters, setFiltersState] = useState<DiscoverFilters>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Mount-time hydration + listener registration. The set-state-in-
    // effect rule fires generically for external-store sync patterns
    // like this one; the equivalent useShowOnMap hook silences it the
    // same way.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiltersState(loadFilters());
    setLoaded(true);
    const listener: Listener = (v) => setFiltersState(v);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setFilters = useCallback(
    (
      next: DiscoverFilters | ((prev: DiscoverFilters) => DiscoverFilters),
    ) => {
      setFiltersState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        saveFilters(resolved);
        return resolved;
      });
    },
    [],
  );

  return { filters, setFilters, loaded };
}
