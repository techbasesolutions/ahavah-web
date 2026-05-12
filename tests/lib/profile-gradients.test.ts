import { describe, expect, it } from "vitest";
import {
  PHOTO_GRADIENT_SETS,
  gradientsFor,
} from "@/lib/profile-gradients";

describe("profile-gradients", () => {
  it("PHOTO_GRADIENT_SETS has 6 sets, each with 3 gradients", () => {
    expect(PHOTO_GRADIENT_SETS).toHaveLength(6);
    for (const set of PHOTO_GRADIENT_SETS) {
      expect(set).toHaveLength(3);
      for (const gradient of set) {
        expect(gradient).toMatch(/^linear-gradient\(/);
      }
    }
  });

  it("gradientsFor returns the same set for the same uuid (determinism)", () => {
    expect(gradientsFor("esther")).toEqual(gradientsFor("esther"));
    expect(gradientsFor("yosef")).toEqual(gradientsFor("yosef"));
    expect(gradientsFor("uuid-12345")).toEqual(gradientsFor("uuid-12345"));
  });

  it("gradientsFor returns one of the PHOTO_GRADIENT_SETS entries", () => {
    const result = gradientsFor("esther");
    expect(PHOTO_GRADIENT_SETS).toContainEqual(result);
  });

  it("gradientsFor returns 3 gradients per call", () => {
    expect(gradientsFor("esther")).toHaveLength(3);
    expect(gradientsFor("a")).toHaveLength(3);
    expect(gradientsFor("")).toHaveLength(3);
  });

  it("gradientsFor distributes the 8 SAMPLE_PROFILES names across sets", () => {
    // Best-effort distribution check — at least 3 distinct sets across the
    // 8 sample profiles so adjacent profiles in /matches don't all show
    // the same gradient family.
    const sampleNames = [
      "daniel", "esther", "yosef", "adina",
      "caleb", "rivka", "ezekiel", "tirzah",
    ];
    const distinctSets = new Set(
      sampleNames.map((n) => gradientsFor(n)[0]),
    );
    expect(distinctSets.size).toBeGreaterThanOrEqual(3);
  });
});
