import { afterEach, describe, expect, it } from "vitest";

import type { DiscoverFilters } from "@/lib/discover-engine";
import {
  STORAGE_KEY,
  clearFilters,
  loadFilters,
  saveFilters,
  subscribeFilters,
} from "@/lib/use-filters";

describe("use-filters storage", () => {
  afterEach(() => {
    window.localStorage.clear();
    // Drain any test-leaked subscribers between runs.
    clearFilters();
  });

  it("loadFilters() returns {} when localStorage is empty (default)", () => {
    expect(loadFilters()).toEqual({});
  });

  it("saveFilters({ country: ['BB'] }) persists and a subsequent load reads it back", () => {
    const next: DiscoverFilters = { country: ["BB"] };
    saveFilters(next);

    // Persisted under the canonical storage key.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify(next),
    );

    // A fresh "mount" (loadFilters call) sees the persisted value —
    // not the {} default. Mirrors how /discover and /map remount after
    // a route change.
    expect(loadFilters()).toEqual(next);
  });

  it("notifies every subscriber on save (in-tab broadcast)", () => {
    const seenA: DiscoverFilters[] = [];
    const seenB: DiscoverFilters[] = [];
    const unsubA = subscribeFilters((v) => seenA.push(v));
    const unsubB = subscribeFilters((v) => seenB.push(v));

    saveFilters({ country: ["BB", "JM"] });

    expect(seenA).toEqual([{ country: ["BB", "JM"] }]);
    expect(seenB).toEqual([{ country: ["BB", "JM"] }]);

    // After unsubscribing, neither consumer sees the next update —
    // proves the listener Set is actually trimmed.
    unsubA();
    unsubB();
    saveFilters({});
    expect(seenA).toHaveLength(1);
    expect(seenB).toHaveLength(1);
  });
});
