import { describe, expect, it } from "vitest";
import { emptyProfile, type Profile } from "@/lib/profile-schema";
import {
  computeCompleteness,
  isDiscoverEligible,
  firstMissingStepFor,
} from "@/lib/profile-completeness";

describe("computeCompleteness", () => {
  it("returns 0% for an empty profile", () => {
    const r = computeCompleteness(emptyProfile());
    expect(r.percent).toBe(0);
    expect(r.requiredFilled).toBe(0);
    expect(r.requiredTotal).toBe(10);
    expect(r.discoverEligible).toBe(false);
  });

  it("counts every required field once it's set", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(3);
    expect(r.requiredTotal).toBe(10);
    expect(r.discoverEligible).toBe(false);
  });

  it("flips discoverEligible to true once all 10 required fields are filled", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      maritalStatus: "never-married",
      children: 0,
      country: "BB",
      intent: ["first-wife"],
      assembly: ["torah-observant"],
      relocation: "wants-partner-willing",
      verificationTags: ["government-id"],
    });
    expect(r.requiredFilled).toBe(10);
    expect(r.requiredTotal).toBe(10);
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

  it("treats empty verificationTags array as not-filled (one tag required)", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      maritalStatus: "never-married",
      children: 0,
      country: "BB",
      intent: ["first-wife"],
      assembly: ["torah-observant"],
      relocation: "local-only",
      verificationTags: [],
    });
    expect(r.requiredFilled).toBe(9);
    expect(r.discoverEligible).toBe(false);
  });

  it("treats empty optional arrays as not-filled (no percent contribution)", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      maritalStatus: "never-married",
      children: 0,
      country: "BB",
      intent: ["first-wife"],
      assembly: ["torah-observant"],
      relocation: "local-only",
      verificationTags: ["government-id"],
      feastDays: [],
      interests: [],
    });
    expect(r.requiredFilled).toBe(10);
    expect(r.percent).toBeLessThan(100);
  });

  it("percent reaches 100 only when all schema fields are populated", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      displayName: "Daniel B.",
      age: 32,
      sex: "male",
      maritalStatus: "never-married",
      children: 2,
      country: "BB",
      stateOrProvince: "St. Michael",
      city: "Bridgetown",
      nationality: "barbadian",
      ethnicities: ["afro-caribbean"],
      languages: ["en"],
      occupation: "Carpenter",
      education: "vocational",
      bio: "Testimony…",
      intent: ["first-wife"],
      assembly: ["torah-observant"],
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
  it("is true when all 10 minimum-required fields are filled", () => {
    expect(
      isDiscoverEligible({
        firstName: "Daniel",
        age: 32,
        sex: "male",
        maritalStatus: "never-married",
        children: 0,
        country: "BB",
        intent: ["first-wife"],
        assembly: ["torah-observant"],
        relocation: "local-only",
        verificationTags: ["government-id"],
      }),
    ).toBe(true);
  });

  it("is false when any single minimum-required field is missing", () => {
    expect(
      isDiscoverEligible({
        firstName: "Daniel",
        age: 32,
        sex: "male",
        maritalStatus: "never-married",
        children: 0,
        country: "BB",
        intent: ["first-wife"],
        assembly: ["torah-observant"],
        relocation: "local-only",
        // verificationTags missing
      }),
    ).toBe(false);
  });
});

// Sub-plan 18 / T1 — marital status + children gate behavior.
// Critical correctness: `children: 0` is a VALID complete answer. The
// completeness check must treat it as filled (uses isAnswered semantics
// for ZERO_ALLOWED_FIELDS, NOT truthy/non-zero).
describe("isDiscoverEligible — marital + children (sub-plan 18 T1)", () => {
  // BASE: an OTHERWISE-eligible profile. All current 10 minimum-required
  // fields populated with valid values (children: 0 is valid). Tests
  // toggle a single field at a time to verify gate behavior.
  const BASE: Profile = {
    firstName: "Test",
    age: 32,
    sex: "male",
    maritalStatus: "never-married",
    children: 0,
    country: "BB",
    intent: ["first-wife"],
    assembly: ["torah-observant"],
    relocation: "wants-partner-willing",
    verificationTags: ["government-id"],
  };

  it("rejects profile missing maritalStatus", () => {
    const p: Profile = { ...BASE, maritalStatus: undefined };
    expect(isDiscoverEligible(p)).toBe(false);
  });

  it("rejects profile missing children", () => {
    const p: Profile = { ...BASE, children: undefined };
    expect(isDiscoverEligible(p)).toBe(false);
  });

  it("ACCEPTS children: 0 (zero is a valid answer)", () => {
    const p: Profile = { ...BASE, children: 0 };
    expect(isDiscoverEligible(p)).toBe(true);
  });

  it("firstMissingStepFor routes to /onboarding/marital-status when missing", () => {
    const p: Profile = { ...BASE, maritalStatus: undefined };
    expect(firstMissingStepFor(p)).toBe("/onboarding/marital-status");
  });

  it("firstMissingStepFor routes to /onboarding/children when marital is set but children missing", () => {
    const p: Profile = { ...BASE, children: undefined };
    expect(firstMissingStepFor(p)).toBe("/onboarding/children");
  });
});
