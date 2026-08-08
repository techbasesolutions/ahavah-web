import { describe, expect, it } from "vitest";
import { emptyProfile, type Profile } from "@/lib/profile-schema";
import {
  computeCompleteness,
  isDiscoverEligible,
  firstMissingStepFor,
} from "@/lib/profile-completeness";

// HISTORY NOTE (why these expectations changed from the sub-plan 18 era):
//   - c4b34c5 collapsed /onboarding/children to a single binary
//     "wants children" question: `wantsChildren` ("yes" | "no") replaced the
//     integer `children` count in MINIMUM_COMPLETE_FIELDS. The legacy
//     `children` field is kept on Profile for round-trip only and is no
//     longer part of completeness (removed from ALL_FIELDS and from
//     ZERO_ALLOWED_FIELDS in profile-completeness.ts).
//   - de1565d removed `verificationTags` from MINIMUM_COMPLETE_FIELDS:
//     /onboarding/verification is a "Skip for now" step, so requiring it
//     stranded users on /discover with a permanent redirect.
//   - e406150 made the completeness loop actionable end to end (field-level
//     suggestion jumps, /profile/edit control for wantsChildren); it did not
//     change the required set but is the shipped feature these tests gate.
// Net result: MINIMUM_COMPLETE_FIELDS has 9 entries (was 10):
//   firstName, age, sex, maritalStatus, wantsChildren, country, intent,
//   assembly, relocation.
// ALL_FIELDS (the percent denominator) has 35 entries; `children` and `dob`
// are NOT among them.

// The current 9 minimum-required fields, all filled with valid values.
// Kept as an explicit literal so an accidental change to the required set
// (adding, removing, or renaming a field) fails these tests loudly.
const ALL_REQUIRED: Profile = {
  firstName: "Daniel",
  age: 32,
  sex: "male",
  maritalStatus: "never-married",
  wantsChildren: "yes",
  country: "BB",
  intent: ["first-wife"],
  assembly: ["torah-observant"],
  relocation: "wants-partner-willing",
};

describe("computeCompleteness", () => {
  it("returns 0% for an empty profile", () => {
    const r = computeCompleteness(emptyProfile());
    expect(r.percent).toBe(0);
    expect(r.requiredFilled).toBe(0);
    // Was 10 in the sub-plan 18 era; 9 since c4b34c5 (children -> binary
    // wantsChildren) and de1565d (verificationTags no longer required).
    expect(r.requiredTotal).toBe(9);
    expect(r.discoverEligible).toBe(false);
  });

  it("counts every required field once it's set", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(3);
    expect(r.requiredTotal).toBe(9);
    expect(r.discoverEligible).toBe(false);
  });

  it("flips discoverEligible to true once all 9 required fields are filled", () => {
    const r = computeCompleteness({ ...ALL_REQUIRED });
    expect(r.requiredFilled).toBe(9);
    expect(r.requiredTotal).toBe(9);
    expect(r.discoverEligible).toBe(true);
    // 9 of the 35 ALL_FIELDS are populated: round(9 / 35 * 100) = 26.
    expect(r.percent).toBe(26);
  });

  it("treats empty string and 0 as not-filled", () => {
    const r = computeCompleteness({
      firstName: "",
      age: 0,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(1);
  });

  // Behavior FLIP from the original test: verificationTags used to be the
  // 10th required field ("one tag required"). Since de1565d verification is
  // a skippable post-onboarding nudge, so an empty (or absent) tags array
  // no longer blocks /discover eligibility.
  it("does not require verificationTags (verification is skippable since de1565d)", () => {
    const r = computeCompleteness({
      ...ALL_REQUIRED,
      verificationTags: [],
    });
    expect(r.requiredFilled).toBe(9);
    expect(r.discoverEligible).toBe(true);
  });

  it("treats empty optional arrays as not-filled (no percent contribution)", () => {
    const r = computeCompleteness({
      ...ALL_REQUIRED,
      verificationTags: ["government-id"],
      feastDays: [],
      interests: [],
    });
    expect(r.requiredFilled).toBe(9);
    // 10 of 35 ALL_FIELDS filled (9 required + verificationTags); the two
    // empty arrays contribute nothing: round(10 / 35 * 100) = 29.
    expect(r.percent).toBe(29);
    expect(r.percent).toBeLessThan(100);
  });

  it("percent reaches 100 only when all schema fields are populated", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      displayName: "Daniel B.",
      age: 32,
      sex: "male",
      maritalStatus: "never-married",
      // wantsChildren is in ALL_FIELDS (and required); the legacy children
      // count below is NOT counted since c4b34c5 - included here to prove
      // it neither helps nor hurts the percent.
      wantsChildren: "yes",
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
  it("is true when all 9 minimum-required fields are filled", () => {
    expect(isDiscoverEligible({ ...ALL_REQUIRED })).toBe(true);
  });

  it("is false when any single minimum-required field is missing", () => {
    // wantsChildren omitted (a field that IS still required). The original
    // test omitted verificationTags, which stopped being required in de1565d.
    const p: Profile = { ...ALL_REQUIRED, wantsChildren: undefined };
    expect(isDiscoverEligible(p)).toBe(false);
  });
});

// Marital status + children gate behavior.
// Originally sub-plan 18 T1, where the integer `children` count was required
// and `children: 0` had special zero-allowed handling. Since c4b34c5 the
// /onboarding/children step asks only the binary wantsChildren question:
// wantsChildren gates /discover, the legacy children count does not.
describe("isDiscoverEligible - marital + wantsChildren gate", () => {
  // BASE: an OTHERWISE-eligible profile (all current 9 minimum-required
  // fields populated). Tests toggle a single field at a time.
  const BASE: Profile = { ...ALL_REQUIRED };

  it("rejects profile missing maritalStatus", () => {
    const p: Profile = { ...BASE, maritalStatus: undefined };
    expect(isDiscoverEligible(p)).toBe(false);
  });

  it("rejects profile missing wantsChildren", () => {
    const p: Profile = { ...BASE, wantsChildren: undefined };
    expect(isDiscoverEligible(p)).toBe(false);
  });

  it("ignores the legacy children count (0, set, or absent all eligible)", () => {
    // children: 0 used to be the zero-allowed edge case; the field is now
    // outside completeness entirely, so every variant stays eligible.
    expect(isDiscoverEligible({ ...BASE, children: 0 })).toBe(true);
    expect(isDiscoverEligible({ ...BASE, children: 3 })).toBe(true);
    expect(isDiscoverEligible({ ...BASE, children: undefined })).toBe(true);
  });

  it("firstMissingStepFor routes to /onboarding/marital-status when missing", () => {
    const p: Profile = { ...BASE, maritalStatus: undefined };
    expect(firstMissingStepFor(p)).toBe("/onboarding/marital-status");
  });

  it("firstMissingStepFor routes to /onboarding/children when marital is set but wantsChildren missing", () => {
    // The children step's requiredField is wantsChildren (wizard-flow.ts,
    // gate/page drift fixed in the 2026-07-20 audit shipped with e406150).
    const p: Profile = { ...BASE, wantsChildren: undefined };
    expect(firstMissingStepFor(p)).toBe("/onboarding/children");
  });
});
