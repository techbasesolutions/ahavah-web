import { describe, expect, it } from "vitest";
import { emptyProfile } from "@/lib/profile-schema";
import {
  computeCompleteness,
  isDiscoverEligible,
} from "@/lib/profile-completeness";

describe("computeCompleteness", () => {
  it("returns 0% for an empty profile", () => {
    const r = computeCompleteness(emptyProfile());
    expect(r.percent).toBe(0);
    expect(r.requiredFilled).toBe(0);
    expect(r.requiredTotal).toBe(6);
    expect(r.discoverEligible).toBe(false);
  });

  it("counts every required field once it's set", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(3);
    expect(r.requiredTotal).toBe(6);
    expect(r.discoverEligible).toBe(false);
  });

  it("flips discoverEligible to true once all 6 required fields are filled", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      country: "BB",
      assembly: "torah-observant",
      torahLevel: "intermediate",
    });
    expect(r.requiredFilled).toBe(6);
    expect(r.requiredTotal).toBe(6);
    expect(r.discoverEligible).toBe(true);
  });

  it("treats empty string and 0 as not-filled", () => {
    const r = computeCompleteness({
      firstName: "",
      age: 0,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(1);
  });

  it("treats empty array as not-filled", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      country: "BB",
      assembly: "torah-observant",
      torahLevel: "intermediate",
      feastDays: [],
      interests: [],
    });
    expect(r.requiredFilled).toBe(6);
    expect(r.percent).toBeLessThan(100);
  });

  it("percent reaches 100 only when all schema fields are populated", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      displayName: "Daniel B.",
      age: 32,
      sex: "male",
      country: "BB",
      stateOrProvince: "St. Michael",
      city: "Bridgetown",
      nationality: "barbadian",
      ethnicities: ["afro-caribbean"],
      languages: ["en"],
      occupation: "Carpenter",
      education: "Trade school",
      bio: "Testimony…",
      intent: "first-wife",
      assembly: "torah-observant",
      torahLevel: "intermediate",
      shabbat: "friday-sunset-saturday-sunset",
      feastDays: ["passover"],
      calendar: "aviv-barley",
      polygyny: "supports",
      headCovering: "encouraged",
      tzitzit: "regularly",
      familyViews: ["wants-children"],
      livingPreferences: ["rural"],
      healthTags: ["non-smoker"],
      interests: ["scripture-study"],
      personalityTraits: ["nurturing"],
      relocation: "international-open",
      communicationPrefs: ["video-calls"],
      verificationTags: ["government-id"],
      boundaryTags: ["no-smokers"],
      voiceIntroUrl: "stub://voice.webm",
      promptCards: [{ promptId: "p1", answer: "…" }],
    });
    expect(r.percent).toBe(100);
    expect(r.discoverEligible).toBe(true);
  });
});

describe("isDiscoverEligible", () => {
  it("is true when all 6 minimum-required fields are filled", () => {
    expect(
      isDiscoverEligible({
        firstName: "Daniel",
        age: 32,
        sex: "male",
        country: "BB",
        assembly: "torah-observant",
        torahLevel: "intermediate",
      }),
    ).toBe(true);
  });

  it("is false when any single minimum-required field is missing", () => {
    expect(
      isDiscoverEligible({
        firstName: "Daniel",
        age: 32,
        sex: "male",
        country: "BB",
        assembly: "torah-observant",
      }),
    ).toBe(false);
  });
});
