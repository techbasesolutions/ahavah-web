import { describe, expect, it } from "vitest";

import {
  NEXT_ACTION_RANK,
  computeVisibilitySteps,
  selectNextAction,
  writtenAtLabel,
  type NextActionKind,
  type RankedItem,
} from "@/lib/next-action";

// Minimal fixture — the ranking algorithm only ever looks at `.kind`, so
// tests carry a small opaque payload to prove the WHOLE object (not just
// the kind) survives the sort/split untouched.
type Fixture = RankedItem & { label: string };

const item = (kind: NextActionKind): Fixture => ({ kind, label: kind });

describe("next-action: NEXT_ACTION_RANK", () => {
  it("matches the SOT's 'Next-action priority order' board 1-8", () => {
    expect(NEXT_ACTION_RANK).toEqual({
      "message-failed": 1,
      "new-match": 2,
      "profile-incomplete": 3,
      "verification-pending": 4,
      "add-city": 5,
      "profile-nudge": 6,
      "premium-upsell": 7,
      "steady-deck": 8,
    });
  });
});

describe("next-action: selectNextAction", () => {
  it("returns null primary and an empty more[] for an empty live set", () => {
    const { primary, more } = selectNextAction([]);
    expect(primary).toBeNull();
    expect(more).toEqual([]);
  });

  it("promotes the single live condition to primary with no collapsed rows", () => {
    const { primary, more } = selectNextAction([item("premium-upsell")]);
    expect(primary?.kind).toBe("premium-upsell");
    expect(more).toEqual([]);
  });

  it("picks the highest-ranked condition as primary regardless of input order", () => {
    // SOT frame 1: new match is primary, city + premium collapse under it.
    const live = [item("premium-upsell"), item("add-city"), item("new-match")];
    const { primary, more } = selectNextAction(live);
    expect(primary?.kind).toBe("new-match");
    expect(more.map((m) => m.kind)).toEqual(["add-city", "premium-upsell"]);
  });

  it("lets message-failed outrank a live new-match (SOT frame 2)", () => {
    const live = [item("new-match"), item("message-failed"), item("premium-upsell")];
    const { primary, more } = selectNextAction(live);
    expect(primary?.kind).toBe("message-failed");
    expect(more.map((m) => m.kind)).toEqual(["new-match", "premium-upsell"]);
  });

  it("never lets premium-upsell outrank a real event even when listed first", () => {
    const live = [item("premium-upsell"), item("profile-incomplete")];
    const { primary } = selectNextAction(live);
    expect(primary?.kind).toBe("profile-incomplete");
  });

  it("collapses every remaining live condition, not just a fixed cap", () => {
    const live = [
      item("verification-pending"),
      item("premium-upsell"),
      item("add-city"),
      item("profile-nudge"),
    ];
    const { primary, more } = selectNextAction(live);
    expect(primary?.kind).toBe("verification-pending");
    // Rank order: add-city (5) < profile-nudge (6) < premium-upsell (7).
    expect(more.map((m) => m.kind)).toEqual(["add-city", "profile-nudge", "premium-upsell"]);
  });

  it("only surfaces steady-deck when it is the sole live entry (caller's responsibility)", () => {
    const { primary, more } = selectNextAction([item("steady-deck")]);
    expect(primary?.kind).toBe("steady-deck");
    expect(more).toEqual([]);
  });

  it("preserves the full fixture object on the winning entry, not just its kind", () => {
    const { primary } = selectNextAction([item("add-city")]);
    expect(primary).toEqual({ kind: "add-city", label: "add-city" });
  });
});

describe("next-action: computeVisibilitySteps", () => {
  it("counts photo + about on top of the missing required-field count", () => {
    const result = computeVisibilitySteps({
      hasPhoto: false,
      hasBio: false,
      missingRequiredCount: 2,
      requiredTotal: 9,
    });
    expect(result.stepsLeft).toBe(4); // 2 required + photo + about
    expect(result.stepsTotal).toBe(11); // 9 + photo + about
    expect(result.doneCount).toBe(7);
  });

  it("reports zero steps left once photo, about and all required fields are done", () => {
    const result = computeVisibilitySteps({
      hasPhoto: true,
      hasBio: true,
      missingRequiredCount: 0,
      requiredTotal: 9,
    });
    expect(result.stepsLeft).toBe(0);
    expect(result.doneCount).toBe(result.stepsTotal);
  });

  it("never reports a negative doneCount", () => {
    const result = computeVisibilitySteps({
      hasPhoto: false,
      hasBio: false,
      missingRequiredCount: 9,
      requiredTotal: 9,
    });
    expect(result.doneCount).toBe(0);
  });
});

describe("next-action: writtenAtLabel", () => {
  // Timezone-independent: ISO strings with NO trailing offset parse as
  // LOCAL time (ECMA-262 date-time form), same as `now` below, so the
  // "same day" / hour-of-day comparisons hold on any machine's TZ.
  const now = new Date(2026, 8, 7, 14, 0); // 2026-09-07 14:00 local

  it("renders a same-day morning timestamp with a qualifier", () => {
    expect(writtenAtLabel("2026-09-07T09:12:00", now)).toMatch(/this morning$/);
  });

  it("renders a same-day evening timestamp with a qualifier", () => {
    expect(writtenAtLabel("2026-09-07T19:30:00", now)).toMatch(/this evening$/);
  });

  it("renders yesterday relative to `now`", () => {
    expect(writtenAtLabel("2026-09-06T09:12:00", now)).toMatch(/^yesterday at/);
  });

  it("renders empty string for an unparseable timestamp", () => {
    expect(writtenAtLabel("not-a-date", now)).toBe("");
  });
});
