import { describe, it, expect } from "vitest";
import { scoreFeast } from "@/lib/scoring/rules/feast";
import type { Profile, FeastDay } from "@/lib/profile-schema";

describe("scoreFeast", () => {
  it("both undefined → 0.5", () => {
    const a: Profile = {};
    const b: Profile = {};
    expect(scoreFeast(a, b)).toBe(0.5);
  });

  it("both empty array → 0.5", () => {
    const a: Profile = { feastDays: [] };
    const b: Profile = { feastDays: [] };
    expect(scoreFeast(a, b)).toBe(0.5);
  });

  it("one undefined → 0.4", () => {
    const a: Profile = { feastDays: ["passover"] };
    const b: Profile = {};
    expect(scoreFeast(a, b)).toBe(0.4);
  });

  it("one empty array → 0.4", () => {
    const a: Profile = { feastDays: ["passover", "shavuot"] };
    const b: Profile = { feastDays: [] };
    expect(scoreFeast(a, b)).toBe(0.4);
  });

  it("identical sets of 3 feasts → 1.0", () => {
    const feasts: FeastDay[] = ["passover", "shavuot", "sukkot"];
    const a: Profile = { feastDays: feasts };
    const b: Profile = { feastDays: feasts };
    expect(scoreFeast(a, b)).toBe(1.0);
  });

  it("overlap on all 7 core feasts → 1.0", () => {
    const coreFests: FeastDay[] = [
      "passover",
      "unleavened-bread",
      "first-fruits",
      "shavuot",
      "trumpets",
      "yom-kippur",
      "sukkot",
    ];
    const a: Profile = { feastDays: coreFests };
    const b: Profile = { feastDays: coreFests };
    expect(scoreFeast(a, b)).toBe(1.0);
  });

  it("overlap only on hanukkah (non-core) → 1.0 (Jaccard is 1.0)", () => {
    const a: Profile = { feastDays: ["hanukkah"] };
    const b: Profile = { feastDays: ["hanukkah"] };
    expect(scoreFeast(a, b)).toBe(1.0);
  });

  it("partial core overlap → Jaccard + core bonus", () => {
    const a: Profile = { feastDays: ["passover", "shavuot"] };
    const b: Profile = { feastDays: ["passover", "yom-kippur"] };
    // intersection: ["passover"] (1 overlap)
    // union: ["passover", "shavuot", "yom-kippur"] (3 total)
    // Jaccard = 1/3
    // coreBonus = 0.05 (one core feast: passover)
    // final = 1/3 + 0.05 = 0.333... + 0.05 = 0.383...
    const result = scoreFeast(a, b);
    expect(result).toBeCloseTo(1 / 3 + 0.05, 4);
  });

  it("three core feasts overlap → Jaccard + 0.15 bonus", () => {
    const a: Profile = {
      feastDays: ["passover", "shavuot", "sukkot", "hanukkah"],
    };
    const b: Profile = {
      feastDays: ["passover", "shavuot", "sukkot", "purim"],
    };
    // intersection: ["passover", "shavuot", "sukkot"] (3 core overlaps)
    // union: ["passover", "shavuot", "sukkot", "hanukkah", "purim"] (5 total)
    // Jaccard = 3/5 = 0.6
    // coreBonus = 3 * 0.05 = 0.15
    // final = 0.6 + 0.15 = 0.75
    const result = scoreFeast(a, b);
    expect(result).toBeCloseTo(0.75, 4);
  });

  it("six core feasts overlap → Jaccard + 0.30 bonus (six < cap of seven)", () => {
    const a: Profile = {
      feastDays: [
        "passover",
        "unleavened-bread",
        "first-fruits",
        "shavuot",
        "trumpets",
        "yom-kippur",
      ],
    };
    const b: Profile = {
      feastDays: [
        "passover",
        "unleavened-bread",
        "first-fruits",
        "shavuot",
        "trumpets",
        "yom-kippur",
      ],
    };
    // intersection: all 6
    // union: all 6
    // Jaccard = 6/6 = 1.0
    // coreBonus = 6 * 0.05 = 0.30 (< 0.35 cap)
    // final = 1.0 + 0.30 = 1.3 → capped at 1.0
    const result = scoreFeast(a, b);
    expect(result).toBe(1.0);
  });

  it("disjoint sets → 0.0", () => {
    const a: Profile = { feastDays: ["passover"] };
    const b: Profile = { feastDays: ["hanukkah"] };
    // intersection: []
    // union: ["passover", "hanukkah"]
    // Jaccard = 0/2 = 0
    // coreBonus = 0
    // final = 0
    expect(scoreFeast(a, b)).toBe(0.0);
  });

  it("symmetry: scoreFeast(a, b) === scoreFeast(b, a)", () => {
    const a: Profile = {
      feastDays: ["passover", "shavuot", "hanukkah"],
    };
    const b: Profile = {
      feastDays: ["passover", "sukkot", "purim"],
    };
    expect(scoreFeast(a, b)).toBe(scoreFeast(b, a));
  });

  it("both observe all 7 core + 2 holidays → 1.0", () => {
    const a: Profile = {
      feastDays: [
        "passover",
        "unleavened-bread",
        "first-fruits",
        "shavuot",
        "trumpets",
        "yom-kippur",
        "sukkot",
        "hanukkah",
        "purim",
      ],
    };
    const b: Profile = {
      feastDays: [
        "passover",
        "unleavened-bread",
        "first-fruits",
        "shavuot",
        "trumpets",
        "yom-kippur",
        "sukkot",
        "hanukkah",
        "purim",
      ],
    };
    // Jaccard = 1.0
    // coreBonus = 7 * 0.05 = 0.35
    // final = min(1.0, 1.0 + 0.35) = 1.0
    expect(scoreFeast(a, b)).toBe(1.0);
  });
});
