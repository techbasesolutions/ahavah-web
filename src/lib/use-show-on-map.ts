"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side "show me on the map" hook + localStorage storage.
 *
 * Sub-plan 14 / T7. Stores a single boolean ("ahavah.show_on_map.v1"),
 * default `true` (visible by default — mirrors Bumpy's behaviour: a
 * profile lands on the map unless the user explicitly opts out).
 *
 * Mirrors the {@link useDecisions} / {@link useProfile} pattern:
 *   - SSR-safe: returns the default on first render, then rehydrates
 *     from localStorage on mount.
 *   - Storage helpers (`loadShowOnMap`, `saveShowOnMap`) are exported
 *     for testability — vitest tests exercise them directly because
 *     this repo doesn't bundle @testing-library/react.
 */

export const STORAGE_KEY = "ahavah.show_on_map.v1";

/** Default for a fresh user — visible on the map. */
export const DEFAULT_SHOW_ON_MAP = true;

export function loadShowOnMap(): boolean {
  if (typeof window === "undefined") return DEFAULT_SHOW_ON_MAP;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_SHOW_ON_MAP;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "boolean" ? parsed : DEFAULT_SHOW_ON_MAP;
  } catch {
    return DEFAULT_SHOW_ON_MAP;
  }
}

export function saveShowOnMap(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearShowOnMap(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export interface UseShowOnMapResult {
  value: boolean;
  setValue: (v: boolean) => void;
  loaded: boolean;
}

export function useShowOnMap(): UseShowOnMapResult {
  const [value, setValueState] = useState<boolean>(DEFAULT_SHOW_ON_MAP);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Mount-time hydration from localStorage: SSR renders with the
    // default (matches the server), then the client immediately
    // re-renders with the stored value. Canonical external-store
    // sync pattern; ESLint's set-state-in-effect rule warns generically.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValueState(loadShowOnMap());
    setLoaded(true);
  }, []);

  const setValue = useCallback((next: boolean) => {
    setValueState(next);
    saveShowOnMap(next);
  }, []);

  return { value, setValue, loaded };
}
