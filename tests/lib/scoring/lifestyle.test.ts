import { describe, it, expect } from "vitest";
import { scoreLifestyle } from "@/lib/scoring/rules/lifestyle";
import type { Profile } from "@/lib/profile-schema";

describe("scoreLifestyle", () => {
  it("both undefined → 0.5", () => {
    const a: Profile = {};
    const b: Profile = {};
    expect(scoreLifestyle(a, b)).toBe(0.5);
  });

  it("one undefined → 0.4", () => {
    const a: Profile = { livingPreferences: ["rural", "homestead"] };
    const b: Profile = {};
    expect(scoreLifestyle(a, b)).toBe(0.4);
  });

  it("identical sets → 1.0", () => {
    const a: Profile = { livingPreferences: ["rural", "homestead"] };
    const b: Profile = { livingPreferences: ["rural", "homestead"] };
    expect(scoreLifestyle(a, b)).toBe(1.0);
  });

  it("partial overlap: [rural, homestead] vs [rural] → 0.6", () => {
    const a: Profile = { livingPreferences: ["rural", "homestead"] };
    const b: Profile = { livingPreferences: ["rural"] };
    // Jaccard: 1 intersection / 2 union = 0.5 + 0.1 bonus = 0.6
    expect(scoreLifestyle(a, b)).toBe(0.6);
  });

  it("zero overlap: [urban] vs [off-grid] → 0.0", () => {
    const a: Profile = { livingPreferences: ["urban"] };
    const b: Profile = { livingPreferences: ["off-grid"] };
    expect(scoreLifestyle(a, b)).toBe(0.0);
  });

  it("both empty arrays → 0.5", () => {
    const a: Profile = { livingPreferences: [] };
    const b: Profile = { livingPreferences: [] };
    expect(scoreLifestyle(a, b)).toBe(0.5);
  });
});
