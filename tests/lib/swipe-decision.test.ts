import { describe, expect, it } from "vitest";
import {
  COMMIT_OFFSET_PX,
  COMMIT_VELOCITY_PX_S,
  decideFromPan,
} from "@/lib/swipe-decision";

describe("decideFromPan", () => {
  // A tiny drag with no velocity → don't commit. Spring back.
  it("returns 'stay' when offset 50 and velocity 100", () => {
    expect(decideFromPan({ offsetX: 50, velocityX: 100 })).toBe("stay");
  });

  // Past the right offset threshold → commit a like.
  it("returns 'like' when offsetX 160 (above COMMIT_OFFSET_PX=140)", () => {
    expect(decideFromPan({ offsetX: 160, velocityX: 0 })).toBe("like");
  });

  // Past the left offset threshold → commit a nope.
  it("returns 'nope' when offsetX -160 (below -COMMIT_OFFSET_PX=-140)", () => {
    expect(decideFromPan({ offsetX: -160, velocityX: 0 })).toBe("nope");
  });

  // Fast right fling — offset below threshold but velocity exceeds it.
  // Tinder-style flicks should still commit.
  it("returns 'like' on fast right fling (offset 40, velocity 1500)", () => {
    expect(decideFromPan({ offsetX: 40, velocityX: 1500 })).toBe("like");
  });

  // Fast left fling — symmetric.
  it("returns 'nope' on fast left fling (offset -40, velocity -1500)", () => {
    expect(decideFromPan({ offsetX: -40, velocityX: -1500 })).toBe("nope");
  });

  // Right of zero but below both thresholds → stay.
  it("returns 'stay' when velocity below COMMIT_VELOCITY_PX_S=1200", () => {
    expect(decideFromPan({ offsetX: 30, velocityX: 1199 })).toBe("stay");
  });

  // Defensive: thresholds are exported with the expected numbers so callers
  // (SwipeCard tap-fallback, future tests) can reuse them without re-deriving.
  it("exports the documented thresholds", () => {
    expect(COMMIT_OFFSET_PX).toBe(140);
    expect(COMMIT_VELOCITY_PX_S).toBe(1200);
  });
});
