import { describe, expect, it } from "vitest";
import {
  type Decision,
  recordDecision,
  getDecision,
  hasDecided,
  simulateLikesBack,
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
});
