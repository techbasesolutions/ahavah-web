import { describe, expect, it } from "vitest";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";
import type { Profile } from "@/lib/profile-schema";

// Each axis rule null-tolerates missing fields (e.g. empty arrays → 0.4/0.5
// neutral scores), so an empty profile is sufficient for the language axis
// tests to run without throwing on the other 8 axes.
const baseProfile: Profile = {};

describe("computeCompatibility - language axis", () => {
  it("perfect overlap returns 1 for the language axis", () => {
    const viewer: Profile = { ...baseProfile, languages: ["en", "es"] };
    const candidate: Profile = { ...baseProfile, languages: ["en", "es"] };
    const result = computeCompatibility(viewer, candidate);
    expect(result.breakdown.language).toBe(1);
  });

  it("partial overlap returns intersection / viewer-size", () => {
    const viewer: Profile = { ...baseProfile, languages: ["en", "es"] };
    const candidate: Profile = { ...baseProfile, languages: ["en", "fr"] };
    const result = computeCompatibility(viewer, candidate);
    expect(result.breakdown.language).toBe(0.5);
  });

  it("no overlap returns 0", () => {
    const viewer: Profile = { ...baseProfile, languages: ["en"] };
    const candidate: Profile = { ...baseProfile, languages: ["ja"] };
    const result = computeCompatibility(viewer, candidate);
    expect(result.breakdown.language).toBe(0);
  });

  it("empty viewer languages returns 0 (no division-by-zero)", () => {
    const viewer: Profile = { ...baseProfile, languages: [] };
    const candidate: Profile = { ...baseProfile, languages: ["en"] };
    const result = computeCompatibility(viewer, candidate);
    expect(result.breakdown.language).toBe(0);
  });

  it("includes language in the 9-axis breakdown shape", () => {
    const result = computeCompatibility(baseProfile, baseProfile);
    expect(Object.keys(result.breakdown).sort()).toEqual(
      [
        "calendar",
        "communication",
        "family",
        "feast",
        "language",
        "lifestyle",
        "observance",
        "polygyny",
        "relocation",
      ].sort(),
    );
  });
});
