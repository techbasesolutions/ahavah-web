import { describe, expect, it } from "vitest";
import { scoreCommunication } from "@/lib/scoring/rules/communication";

describe("scoreCommunication", () => {
  it("returns 0.5 when both sides have no communicationPrefs set", () => {
    expect(scoreCommunication({}, {})).toBe(0.5);
  });

  it("returns 0.4 when one side has communicationPrefs but the other doesn't", () => {
    expect(
      scoreCommunication({ communicationPrefs: ["video-calls"] }, {}),
    ).toBe(0.4);
    expect(
      scoreCommunication({}, { communicationPrefs: ["in-person"] }),
    ).toBe(0.4);
  });

  it("returns 1.0 when both sides have identical sets", () => {
    expect(
      scoreCommunication(
        { communicationPrefs: ["video-calls", "in-person"] },
        { communicationPrefs: ["video-calls", "in-person"] },
      ),
    ).toBe(1.0);
  });

  it("returns Jaccard + 0.1 bonus when there is partial overlap", () => {
    // ["video-calls", "in-person"] vs ["video-calls"]
    // Intersection: ["video-calls"] (1 item)
    // Union: ["video-calls", "in-person"] (2 items)
    // Jaccard: 1/2 = 0.5, bonus: +0.1 → 0.6
    expect(
      scoreCommunication(
        { communicationPrefs: ["video-calls", "in-person"] },
        { communicationPrefs: ["video-calls"] },
      ),
    ).toBe(0.6);
  });

  it("returns 0.2 when rhythm conflict exists with no other overlap", () => {
    // ["frequent"] vs ["slow-paced-courtship"]
    // Rhythm conflict detected, no intersection → 0.2
    expect(
      scoreCommunication(
        { communicationPrefs: ["frequent"] },
        { communicationPrefs: ["slow-paced-courtship"] },
      ),
    ).toBe(0.2);

    // Reverse: ["slow-paced-courtship"] vs ["frequent"]
    expect(
      scoreCommunication(
        { communicationPrefs: ["slow-paced-courtship"] },
        { communicationPrefs: ["frequent"] },
      ),
    ).toBe(0.2);
  });

  it("returns 0.0 when there is no overlap and no rhythm conflict", () => {
    // ["video-calls"] vs ["texting"]
    // No intersection, no rhythm conflict → 0.0
    expect(
      scoreCommunication(
        { communicationPrefs: ["video-calls"] },
        { communicationPrefs: ["texting"] },
      ),
    ).toBe(0.0);
  });

  it("ignores rhythm conflict when there are other overlaps", () => {
    // ["frequent", "video-calls"] vs ["slow-paced-courtship", "video-calls"]
    // Rhythm conflict: yes, but they share "video-calls"
    // Intersection: ["video-calls"] (1 item)
    // Union: ["frequent", "video-calls", "slow-paced-courtship"] (3 items)
    // Jaccard: 1/3 ≈ 0.333, bonus: +0.1 → 0.433
    expect(
      scoreCommunication(
        { communicationPrefs: ["frequent", "video-calls"] },
        { communicationPrefs: ["slow-paced-courtship", "video-calls"] },
      ),
    ).toBeCloseTo(0.433, 2);
  });
});
