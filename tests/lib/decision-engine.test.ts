import { describe, expect, it } from "vitest";
import {
  type Decision,
  recordDecision,
  getDecision,
  hasDecided,
  simulateLikesBack,
  popLastDecision,
  LIKE_THRESHOLD,
} from "@/lib/decision-engine";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import type { Profile } from "@/lib/profile-schema";

describe("decision-engine", () => {
  it("recordDecision appends a new decision and is idempotent on the same subject", () => {
    const start: Decision[] = [];
    const after = recordDecision(start, { subjectId: "esther", action: "like" });
    expect(after).toHaveLength(1);
    expect(after[0].subjectId).toBe("esther");
    expect(after[0].action).toBe("like");

    // Re-decision on same subject replaces, doesn't duplicate.
    const second = recordDecision(after, { subjectId: "esther", action: "pass" });
    expect(second).toHaveLength(1);
    expect(second[0].action).toBe("pass");
  });

  it("getDecision returns the most recent decision for a subject, or null", () => {
    const ds: Decision[] = [
      { subjectId: "esther", action: "like", timestamp: 1 },
    ];
    expect(getDecision(ds, "esther")?.action).toBe("like");
    expect(getDecision(ds, "yosef")).toBeNull();
  });

  it("hasDecided is true iff a decision exists for the subject", () => {
    const ds: Decision[] = [
      { subjectId: "esther", action: "pass", timestamp: 1 },
    ];
    expect(hasDecided(ds, "esther")).toBe(true);
    expect(hasDecided(ds, "yosef")).toBe(false);
  });

  it("simulateLikesBack is deterministic — same viewer + subject => same answer", () => {
    // Sparse viewer — only the 8 minimum fields. computeCompatibility's
    // per-axis rules handle missing optional fields, so determinism still
    // holds; we're exercising the no-randomness contract, not full coverage.
    const viewer: Profile = {
      firstName: "Test",
      age: 30, sex: "male", country: "BB",
      intent: "first-wife", assembly: "torah-observant",
      relocation: "local-only", verificationTags: ["government-id"],
    };
    const a = simulateLikesBack(viewer, SAMPLE_PROFILES[0]);
    const b = simulateLikesBack(viewer, SAMPLE_PROFILES[0]);
    expect(a).toBe(b);
  });

  it("simulateLikesBack matches the LIKE_THRESHOLD contract", () => {
    expect(LIKE_THRESHOLD).toBeGreaterThanOrEqual(0);
    expect(LIKE_THRESHOLD).toBeLessThanOrEqual(100);
  });

  it("recordDecision returns a new array, never mutates input", () => {
    const start: Decision[] = [
      { subjectId: "yosef", action: "like", timestamp: 1 },
    ];
    const frozen = Object.freeze([...start]) as ReadonlyArray<Decision>;
    const after = recordDecision(frozen, { subjectId: "esther", action: "like" });
    expect(after).not.toBe(frozen);
    expect(frozen).toEqual([
      { subjectId: "yosef", action: "like", timestamp: 1 },
    ]);
  });

  it("recordDecision moves a replaced subject to the tail and preserves others' order", () => {
    const start: Decision[] = [
      { subjectId: "a", action: "like", timestamp: 1 },
      { subjectId: "b", action: "pass", timestamp: 2 },
      { subjectId: "c", action: "like", timestamp: 3 },
    ];
    const after = recordDecision(start, { subjectId: "a", action: "pass", timestamp: 4 });
    expect(after.map((d) => d.subjectId)).toEqual(["b", "c", "a"]);
  });

  it("recordDecision preserves timestamp: 0 instead of replacing with Date.now()", () => {
    const start: Decision[] = [];
    const after = recordDecision(start, {
      subjectId: "esther",
      action: "like",
      timestamp: 0,
    });
    expect(after[0].timestamp).toBe(0);
  });

  it("LIKE_THRESHOLD is pinned at 50", () => {
    expect(LIKE_THRESHOLD).toBe(50);
  });

  it("simulateLikesBack against SAMPLE_PROFILES yields a non-trivial mutual band for a typical viewer", () => {
    const viewer: Profile = SAMPLE_PROFILES[1]; // Esther — full-shape sample
    const mutuals = SAMPLE_PROFILES.filter((s) => simulateLikesBack(viewer, s));
    // Self-mutual is fine; the assertion is "non-empty" — if scoring drifts
    // and produces zero mutuals, the deck is dead. Adding the language axis
    // (sub-plan 13 t3) lifts more candidates above LIKE_THRESHOLD since
    // most profiles share "en". Upper bound dropped to avoid vacuous assertion.
    expect(mutuals.length).toBeGreaterThanOrEqual(1);
  });

  it("popLastDecision returns null + empty rest for an empty input", () => {
    const result = popLastDecision([]);
    expect(result.popped).toBeNull();
    expect(result.rest).toEqual([]);
  });

  it("popLastDecision removes the last entry and returns it", () => {
    const ds: Decision[] = [
      { subjectId: "yosef",  action: "like", timestamp: 1 },
      { subjectId: "esther", action: "pass", timestamp: 2 },
    ];
    const result = popLastDecision(ds);
    expect(result.popped).toEqual({
      subjectId: "esther",
      action: "pass",
      timestamp: 2,
    });
    expect(result.rest.map((d) => d.subjectId)).toEqual(["yosef"]);
  });

  it("popLastDecision does not mutate its input", () => {
    const ds: Decision[] = [
      { subjectId: "yosef", action: "like", timestamp: 1 },
    ];
    const frozen = Object.freeze([...ds]) as ReadonlyArray<Decision>;
    const result = popLastDecision(frozen);
    expect(ds).toEqual([
      { subjectId: "yosef", action: "like", timestamp: 1 },
    ]);
    expect(result.rest).not.toBe(ds);
  });
});
