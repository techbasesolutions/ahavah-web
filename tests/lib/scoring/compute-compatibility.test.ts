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

// Regression coverage for the NaN% bug surfaced during SP21 T8 smoke walk
// on /matches: a minimal-data viewer compared against a fully-populated
// sample produced NaN% on the CompatPill. Each axis rule guards its own
// undefined-input case, but the composite math additionally skips any
// non-finite axis and floors the final score at 0 if anything still
// escapes.
describe("computeCompatibility - finite-score guard", () => {
  it("empty viewer + empty candidate returns a finite score", () => {
    const result = computeCompatibility({}, {});
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("minimal viewer + populated candidate returns a finite score", () => {
    const viewer: Profile = {
      firstName: "TestViewer",
      age: 32,
      sex: "male",
      country: "BB",
      intent: "first-wife",
      assembly: "torah-observant",
      polygyny: "supports",
      relocation: "wants-partner-willing",
      verificationTags: ["government-id"],
      healthTags: ["non-smoker"],
    };
    const candidate: Profile = {
      firstName: "Adina",
      age: 24,
      sex: "female",
      country: "IL",
      torahLevel: "experienced",
      shabbat: "friday-sunset-saturday-sunset",
      feastDays: ["passover", "shavuot"],
      calendar: "rabbinic",
      polygyny: "monogamy-only",
      familyViews: ["wants-children"],
      livingPreferences: ["urban"],
      healthTags: ["non-smoker", "fitness"],
      communicationPrefs: ["video-calls"],
      relocation: "international-open",
      languages: ["en", "he"],
    };
    const result = computeCompatibility(viewer, candidate);
    expect(Number.isFinite(result.score)).toBe(true);
  });
});
