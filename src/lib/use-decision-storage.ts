import type { Decision } from "@/lib/decision-engine";

export const STORAGE_KEY = "ahavah.decisions.v1";

export function loadDecisions(): Decision[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Decision[]) : [];
  } catch {
    return [];
  }
}

export function saveDecisions(decisions: ReadonlyArray<Decision>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

export function clearDecisions(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
