import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/profile-schema";
import {
  WIZARD_STEPS,
  positionOf,
  nextOf,
  backOf,
  firstMissingStepFor,
  routeForField,
} from "@/lib/wizard-flow";

describe("wizard-flow", () => {
  it("WIZARD_STEPS has 14 entries in the canonical order", () => {
    expect(WIZARD_STEPS).toHaveLength(14);
    expect(WIZARD_STEPS[0].href).toBe("/onboarding/verify-email");
    expect(WIZARD_STEPS[13].href).toBe("/onboarding/verification");
  });

  it("positionOf returns 1-indexed step + total for an existing href", () => {
    const pos = positionOf("/onboarding/name");
    expect(pos.step).toBe(3);
    expect(pos.totalSteps).toBe(14);
  });

  it("positionOf wires back + next for a middle step", () => {
    const pos = positionOf("/onboarding/dob");
    expect(pos.back).toBe("/onboarding/name");
    expect(pos.next).toBe("/onboarding/gender");
  });

  it("positionOf returns step=0 for an unknown href (does not throw)", () => {
    const pos = positionOf("/onboarding/nonexistent");
    expect(pos.step).toBe(0);
    expect(pos.totalSteps).toBe(14);
    expect(pos.back).toBeNull();
    expect(pos.next).toBeNull();
  });

  it("nextOf returns the next href, or null at the end", () => {
    expect(nextOf("/onboarding/name")).toBe("/onboarding/dob");
    expect(nextOf("/onboarding/verification")).toBeNull();
  });

  it("backOf returns the previous href, or null at the start", () => {
    expect(backOf("/onboarding/dob")).toBe("/onboarding/name");
    expect(backOf("/onboarding/verify-email")).toBeNull();
  });

  it("routeForField maps a required-field key to its wizard route", () => {
    expect(routeForField("firstName")).toBe("/onboarding/name");
    expect(routeForField("intent")).toBe("/onboarding/looking-for");
    expect(routeForField("verificationTags")).toBe("/onboarding/verification");
    // Fields without a wizard step (e.g. interests is not required) return null
    expect(routeForField("interests")).toBeNull();
  });

  it("firstMissingStepFor walks WIZARD_STEPS in order, not schema order", () => {
    const partial: Profile = {
      firstName: "Test",
      // age, sex, country, intent, assembly, relocation, verificationTags missing
      verificationTags: ["government-id"], // late field set early — should NOT short-circuit
    };
    // age is the next required after firstName, so step 4 (/onboarding/dob)
    expect(firstMissingStepFor(partial)).toBe("/onboarding/dob");
  });

  it("firstMissingStepFor returns null when every required field is filled", () => {
    const full: Profile = {
      firstName: "Test",
      age: 30,
      sex: "male",
      maritalStatus: "never-married",
      children: 0,
      country: "BB",
      intent: "first-wife",
      assembly: "torah-observant",
      relocation: "local-only",
      verificationTags: ["government-id"],
    };
    expect(firstMissingStepFor(full)).toBeNull();
  });

  it("firstMissingStepFor on an empty profile returns the first required step", () => {
    expect(firstMissingStepFor({})).toBe("/onboarding/name");
  });
});
