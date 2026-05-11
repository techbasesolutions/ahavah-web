import { describe, expect, it } from "vitest";
import { scoreObservance } from "@/lib/scoring/rules/observance";

describe("scoreObservance", () => {
  it("returns 1.0 when both have the same Torah level", () => {
    expect(scoreObservance({ torahLevel: "learning" }, { torahLevel: "learning" })).toBe(1.0);
    expect(scoreObservance({ torahLevel: "beginner" }, { torahLevel: "beginner" })).toBe(1.0);
    expect(scoreObservance({ torahLevel: "intermediate" }, { torahLevel: "intermediate" })).toBe(
      1.0,
    );
    expect(scoreObservance({ torahLevel: "experienced" }, { torahLevel: "experienced" })).toBe(
      1.0,
    );
  });

  it("returns 0.8 for adjacent rungs on the ladder", () => {
    expect(scoreObservance({ torahLevel: "learning" }, { torahLevel: "beginner" })).toBe(0.8);
    expect(scoreObservance({ torahLevel: "beginner" }, { torahLevel: "learning" })).toBe(0.8);
    expect(scoreObservance({ torahLevel: "beginner" }, { torahLevel: "intermediate" })).toBe(0.8);
    expect(scoreObservance({ torahLevel: "intermediate" }, { torahLevel: "beginner" })).toBe(0.8);
    expect(scoreObservance({ torahLevel: "intermediate" }, { torahLevel: "experienced" })).toBe(
      0.8,
    );
    expect(scoreObservance({ torahLevel: "experienced" }, { torahLevel: "intermediate" })).toBe(
      0.8,
    );
  });

  it("returns 0.5 for two rungs apart", () => {
    expect(scoreObservance({ torahLevel: "learning" }, { torahLevel: "intermediate" })).toBe(0.5);
    expect(scoreObservance({ torahLevel: "intermediate" }, { torahLevel: "learning" })).toBe(0.5);
    expect(scoreObservance({ torahLevel: "beginner" }, { torahLevel: "experienced" })).toBe(0.5);
    expect(scoreObservance({ torahLevel: "experienced" }, { torahLevel: "beginner" })).toBe(0.5);
  });

  it("returns 0.2 for extremes (learning vs experienced)", () => {
    expect(scoreObservance({ torahLevel: "learning" }, { torahLevel: "experienced" })).toBe(0.2);
    expect(scoreObservance({ torahLevel: "experienced" }, { torahLevel: "learning" })).toBe(0.2);
  });

  it("returns 0.5 when either side has no Torah level set", () => {
    expect(scoreObservance({ torahLevel: "learning" }, {})).toBe(0.5);
    expect(scoreObservance({}, { torahLevel: "experienced" })).toBe(0.5);
    expect(scoreObservance({}, {})).toBe(0.5);
  });

  it("is symmetric: scoreObservance(a, b) === scoreObservance(b, a)", () => {
    const pairs = [
      [{ torahLevel: "learning" as const }, { torahLevel: "intermediate" as const }],
      [{ torahLevel: "beginner" as const }, { torahLevel: "experienced" as const }],
      [{ torahLevel: "learning" as const }, {}],
    ];

    for (const [a, b] of pairs) {
      expect(scoreObservance(a, b)).toBe(scoreObservance(b, a));
    }
  });
});
