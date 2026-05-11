import { beforeEach, describe, expect, it } from "vitest";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  STORAGE_KEY,
} from "@/lib/use-profile-storage";
import { emptyProfile } from "@/lib/profile-schema";

describe("profile storage adapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("STORAGE_KEY is namespaced for Ahavah", () => {
    expect(STORAGE_KEY).toBe("ahavah.profile.v1");
  });

  it("loadProfile returns emptyProfile when storage is empty", () => {
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("saveProfile + loadProfile round-trips a Profile", () => {
    const p = {
      firstName: "Daniel",
      age: 32,
      sex: "male" as const,
      assembly: "torah-observant" as const,
      feastDays: ["passover", "shavuot"] as const,
    };
    saveProfile(p);
    const loaded = loadProfile();
    expect(loaded.firstName).toBe("Daniel");
    expect(loaded.feastDays).toEqual(["passover", "shavuot"]);
  });

  it("loadProfile recovers gracefully from malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("clearProfile removes the stored value", () => {
    saveProfile({ firstName: "Daniel" });
    clearProfile();
    expect(loadProfile()).toEqual(emptyProfile());
  });
});
