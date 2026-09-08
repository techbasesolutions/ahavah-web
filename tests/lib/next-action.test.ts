import { describe, expect, it } from "vitest";

import {
  NEXT_ACTION_RANK,
  computeVisibilitySteps,
  finishProfilePrimaryLabel,
  greetingFor,
  pickProfileCompletionCard,
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
  it("matches the SOT's 'Next-action priority order' board, plus profile-finish", () => {
    // profile-finish (rank 5) was added 2026-09-08 alongside the
    // profile-incomplete/eligibility bug fix — it is not one of the SOT's
    // original 8 ranks, slotted right after verification-pending, before
    // the other evergreen nudges. See NEXT_ACTION_RANK's own doc comment.
    expect(NEXT_ACTION_RANK).toEqual({
      "message-failed": 1,
      "new-match": 2,
      "profile-incomplete": 3,
      "verification-pending": 4,
      "profile-finish": 5,
      "add-city": 6,
      "profile-nudge": 7,
      "premium-upsell": 8,
      "steady-deck": 9,
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
    // Rank order: add-city (6) < profile-nudge (7) < premium-upsell (8).
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

describe("next-action: pickProfileCompletionCard (2026-09-08 prod bug fix)", () => {
  // Prod report: a Gold-verified, already-appearing member (10 of 11
  // steps done -> stepsLeft = 1, but isDiscoverEligible === true) was
  // shown the BLOCKING "you are hidden ... before you appear in the
  // deck" card. That's false for an eligible member. These tests lock
  // the fix at the decision-function level.

  it("(a) eligible + incomplete -> the soft 'profile-finish' nudge, never the blocking card", () => {
    const result = pickProfileCompletionCard({ eligible: true, stepsLeft: 1 });
    expect(result).toBe("profile-finish");
  });

  it("(b) not-eligible + incomplete -> the blocking 'profile-incomplete' (hidden) card", () => {
    const result = pickProfileCompletionCard({ eligible: false, stepsLeft: 4 });
    expect(result).toBe("profile-incomplete");
  });

  it("(d) fully complete (stepsLeft === 0) -> no card at all, eligible or not", () => {
    expect(pickProfileCompletionCard({ eligible: true, stepsLeft: 0 })).toBeNull();
    expect(pickProfileCompletionCard({ eligible: false, stepsLeft: 0 })).toBeNull();
  });

  it("never returns the blocking card for an eligible member, at any stepsLeft", () => {
    for (let stepsLeft = 1; stepsLeft <= 11; stepsLeft++) {
      expect(pickProfileCompletionCard({ eligible: true, stepsLeft })).toBe("profile-finish");
    }
  });
});

describe("next-action: greetingFor (2026-09-08 prod bug fix)", () => {
  it("(a) stays 'Shalom' for the soft profile-finish nudge (eligible + incomplete)", () => {
    expect(greetingFor("profile-finish")).toBe("Shalom");
  });

  it("(b) is 'Welcome' only for the genuinely-hidden profile-incomplete card", () => {
    expect(greetingFor("profile-incomplete")).toBe("Welcome");
  });

  it("is 'Shalom' for every other kind, including null (nothing live)", () => {
    const otherKinds: NextActionKind[] = [
      "message-failed",
      "new-match",
      "verification-pending",
      "add-city",
      "profile-nudge",
      "premium-upsell",
      "steady-deck",
    ];
    for (const kind of otherKinds) {
      expect(greetingFor(kind)).toBe("Shalom");
    }
    expect(greetingFor(null)).toBe("Shalom");
  });
});

describe("next-action: finishProfilePrimaryLabel (2026-09-08 prod bug fix)", () => {
  // Prod report: the primary CTA said "Add a photo" even when
  // profile.photos was non-empty. The label must name the REAL missing
  // item.

  it("(c) says 'Add a photo' only when the photo is actually missing", () => {
    expect(finishProfilePrimaryLabel({ hasPhoto: false, hasBio: true })).toBe("Add a photo");
  });

  it("(c) says 'Add your about' when the photo exists but the about section doesn't", () => {
    expect(finishProfilePrimaryLabel({ hasPhoto: true, hasBio: false })).toBe("Add your about");
  });

  it("never says 'Add a photo' when a photo already exists", () => {
    expect(finishProfilePrimaryLabel({ hasPhoto: true, hasBio: false })).not.toBe("Add a photo");
    expect(finishProfilePrimaryLabel({ hasPhoto: true, hasBio: true })).not.toBe("Add a photo");
  });

  it("falls back to a generic label once photo and about are both present", () => {
    expect(finishProfilePrimaryLabel({ hasPhoto: true, hasBio: true })).toBe("Finish profile");
  });

  it("prioritizes the photo over the about section when both are missing", () => {
    expect(finishProfilePrimaryLabel({ hasPhoto: false, hasBio: false })).toBe("Add a photo");
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
