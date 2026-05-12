import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_SHOW_ON_MAP,
  STORAGE_KEY,
  clearShowOnMap,
  loadShowOnMap,
  saveShowOnMap,
} from "@/lib/use-show-on-map";

describe("use-show-on-map storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to true when localStorage is empty (initial value)", () => {
    expect(loadShowOnMap()).toBe(DEFAULT_SHOW_ON_MAP);
    expect(loadShowOnMap()).toBe(true);
  });

  it("setValue(false) persists to localStorage and load returns the new value", () => {
    saveShowOnMap(false);
    // Persisted (raw inspection).
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
    // Subsequent reads see the persisted value (simulates a remount
    // calling loadShowOnMap() during the hook's mount-time hydration
    // effect).
    expect(loadShowOnMap()).toBe(false);
  });

  it("a subsequent mount reads the previously persisted value", () => {
    // First "mount" — user opts out.
    saveShowOnMap(false);
    expect(loadShowOnMap()).toBe(false);

    // Simulate a brand new session: storage survives across mounts,
    // so a fresh load must return false (NOT the default true).
    expect(loadShowOnMap()).toBe(false);

    // Flip back on, verify the round-trip again.
    saveShowOnMap(true);
    expect(loadShowOnMap()).toBe(true);
  });

  it("recovers from corruption by returning the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json");
    expect(loadShowOnMap()).toBe(DEFAULT_SHOW_ON_MAP);
  });

  it("ignores non-boolean JSON by returning the default", () => {
    window.localStorage.setItem(STORAGE_KEY, '"yes"');
    expect(loadShowOnMap()).toBe(DEFAULT_SHOW_ON_MAP);

    window.localStorage.setItem(STORAGE_KEY, "42");
    expect(loadShowOnMap()).toBe(DEFAULT_SHOW_ON_MAP);
  });

  it("clearShowOnMap removes the persisted value", () => {
    saveShowOnMap(false);
    clearShowOnMap();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(null);
    expect(loadShowOnMap()).toBe(DEFAULT_SHOW_ON_MAP);
  });
});
