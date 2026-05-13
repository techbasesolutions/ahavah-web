import { beforeEach, describe, expect, it } from "vitest";
import {
  loadProfileFromCache,
  saveProfileToCache,
  clearProfileCache,
} from "@/lib/use-profile-storage";
import { PROFILE_CACHE_KEY } from "@/lib/storage-keys";

/**
 * Phase W reframing: localStorage is a CACHE, not source of truth. The server
 * (`/me`) is source of truth. These three helpers do exactly one thing each
 * (read raw cache, write cache, drop cache) — they do NOT fall back to
 * `emptyProfile()` because an empty cache (`null` return) is a meaningful
 * signal to the caller ("nothing cached yet, fetch from server").
 */
describe("profile cache adapter (Phase W)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loadProfileFromCache returns null when storage is empty", () => {
    expect(loadProfileFromCache()).toBeNull();
  });

  it("saveProfileToCache + loadProfileFromCache round-trips a Profile", () => {
    saveProfileToCache({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      assembly: "torah-observant",
      feastDays: ["passover", "shavuot"],
    });
    const loaded = loadProfileFromCache();
    expect(loaded).not.toBeNull();
    expect(loaded?.firstName).toBe("Daniel");
    expect(loaded?.feastDays).toEqual(["passover", "shavuot"]);
  });

  it("clearProfileCache removes the stored value", () => {
    saveProfileToCache({ firstName: "Daniel" });
    clearProfileCache();
    expect(loadProfileFromCache()).toBeNull();
  });

  it("loadProfileFromCache returns null for malformed JSON (and self-heals)", () => {
    // Cache poisoning shouldn't crash hydration. Corrupted entries are
    // dropped so the next save can repopulate.
    localStorage.setItem(PROFILE_CACHE_KEY, "{not json");
    expect(loadProfileFromCache()).toBeNull();
    // Self-heal: the corrupt entry is gone, so a save works normally.
    saveProfileToCache({ firstName: "Recovered" });
    expect(loadProfileFromCache()?.firstName).toBe("Recovered");
  });
});
